use anchor_lang::prelude::*;

use super::error::AuctionError;

pub fn transfer_lamports(from: &AccountInfo<'_>, to: &AccountInfo<'_>, amount: u64) -> Result<()> {
    require!(**from.lamports.borrow() >= amount, AuctionError::InsufficientLamports);

    **from.lamports.borrow_mut() = from
        .lamports()
        .checked_sub(amount)
        .ok_or(AuctionError::InsufficientLamports)?;
    **to.lamports.borrow_mut() = to
        .lamports()
        .checked_add(amount)
        .ok_or(AuctionError::ArithmeticOverflow)?;

    Ok(())
}