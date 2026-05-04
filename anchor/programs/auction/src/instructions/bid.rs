use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer as SystemTransfer};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use super::error::AuctionError;
use crate::{Auction, Bids};

#[derive(Accounts)]
pub struct Bid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(mut)]
    pub auction: Account<'info, Auction>,

    #[account(
        init_if_needed,
        payer = bidder,
        space = Bids::DISCRIMINATOR.len() + Bids::INIT_SPACE,
        seeds = [b"bids", auction.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub bid_record: Account<'info, Bids>,

    #[account(
        init_if_needed,
        payer = bidder,
        associated_token::mint = bid_mint,
        associated_token::authority = bidder,
    )]
    pub bidder_bid_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = bid_mint,
        associated_token::authority = auction,
    )]
    pub vault_bid: InterfaceAccount<'info, TokenAccount>,

    #[account(address = auction.bid_mint)]
    pub bid_mint: InterfaceAccount<'info, Mint>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> Bid<'info> {
    pub fn bid(&mut self, additional_amount: u64, bumps: &BidBumps) -> Result<()> {
        // Enforce the time limit
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < self.auction.end_time,
            AuctionError::AuctionEnded
        );

        // Initialize baseline data if this is a brand new bid
        if self.bid_record.amount == 0 {
            self.bid_record.bidder = self.bidder.key();
            self.bid_record.bump = bumps.bid_record;
            self.bid_record.refunded = false;
        }

        // Update the user's total deposited amount
        self.bid_record.amount = self
            .bid_record
            .amount
            .checked_add(additional_amount)
            .unwrap();

        // Updating the Auction leaderboard if they are the new highest bidder
        if self.bid_record.amount > self.auction.highest_bid_amount {
            self.auction.highest_bidder = self.bidder.key();
            self.auction.highest_bid_amount = self.bid_record.amount;
        }

        if self.auction.native_sol {
            // Native SOL bids must use System Program transfer since bidder is not program-owned.
            transfer(
                CpiContext::new(
                    self.system_program.to_account_info(),
                    SystemTransfer {
                        from: self.bidder.to_account_info(),
                        to: self.auction.to_account_info(),
                    },
                ),
                additional_amount,
            )
        } else {
            // SPL token bids are deposited into the shared vault ATA.
            let transfer_accounts = TransferChecked {
                from: self.bidder_bid_ata.to_account_info(),
                to: self.vault_bid.to_account_info(),
                mint: self.bid_mint.to_account_info(),
                authority: self.bidder.to_account_info(),
            };

            let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), transfer_accounts);
            transfer_checked(cpi_ctx, additional_amount, self.bid_mint.decimals)
        }
    }
}
