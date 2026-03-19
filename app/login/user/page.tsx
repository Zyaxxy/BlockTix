"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, UserRound, ShieldCheck } from "lucide-react";
import { SoltixInput } from "@/app/components/SoltixInput";

const soltixEase = [0.23, 1, 0.32, 1] as const;

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function UserLogin() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateLogin = () => {
    const e: FormErrors = {};
    if (!loginData.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(loginData.email)) e.email = "Invalid email";
    if (!loginData.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRegister = () => {
    const e: FormErrors = {};
    if (!registerData.username.trim()) e.username = "Username is required";
    if (!registerData.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(registerData.email)) e.email = "Invalid email";
    if (!registerData.password) e.password = "Password is required";
    else if (registerData.password.length < 8) e.password = "Min 8 characters";
    if (registerData.password !== registerData.confirmPassword) e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validateLogin()) {
      // handle login
    }
  };

  const handleRegister = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validateRegister()) {
      // handle register
    }
  };

  const switchMode = (m: "login" | "register") => {
    setErrors({});
    setMode(m);
  };

  return (
    <main className="relative min-h-svh w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-background">
      
      <div className="absolute inset-0 z-0">

  
  <img
    src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2070"
    alt="Concert Background"
    className="w-full h-full object-cover scale-110 blur-[3px]"
  />

  
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.25),rgba(0,0,0,0.95))]" />

  
  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/90" />

</div>

      
      <div className="absolute top-1/4 -left-20 w-72 sm:w-96 h-72 sm:h-96 bg-secondary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-72 sm:w-96 h-72 sm:h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "700ms" }} />

      
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: soltixEase }}
        className="relative z-10 w-full max-w-[440px]"
      >
        <div className="soltix-glass p-6 sm:p-8 overflow-hidden">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 soltix-gradient-btn rounded-2xl flex items-center justify-center mb-4">
              <UserRound className="text-secondary-foreground" size={28} />
            </div>
            <h1 className="text-2xl font-bold tracking-tighter text-white">SOLTIX</h1>
            <p className="text-muted-foreground text-sm">Next-gen event access</p>
          </div>

         
          <div className="relative flex p-1 bg-white/5 backdrop-blur-xl rounded-2xl mb-8 border border-white/10">
  
  
  <motion.div
    className="absolute inset-1 rounded-xl bg-gradient-to-r from-purple-500 to-purple-700 shadow-[0_0_20px_rgba(124,58,237,0.5)]"
    initial={false}
    animate={{ x: mode === "login" ? "0%" : "100%" }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
    style={{ width: "calc(50% - 4px)" }}
  />

  
  <button
    onClick={() => switchMode("login")}
    className={`relative z-10 flex-1 py-2 text-sm font-medium transition-all duration-300 ${
      mode === "login"
        ? "text-white"
        : "text-gray-400 hover:text-white"
    }`}
  >
    Sign In
  </button>

  
  <button
    onClick={() => switchMode("register")}
    className={`relative z-10 flex-1 py-2 text-sm font-medium transition-all duration-300 ${
      mode === "register"
        ? "text-white"
        : "text-gray-400 hover:text-white"
    }`}
  >
    Register
  </button>

</div>

          
          <AnimatePresence mode="wait">
  {mode === "login" ? (
    <motion.form
      key="login"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      onSubmit={handleLogin}
    >
     
      <div className="space-y-1 mb-2">
        <h2 className="text-2xl font-semibold text-white">
          Welcome back
        </h2>
        <p className="text-gray-400 text-sm">
          Enter your credentials to access tickets.
        </p>
      </div>

      
      <SoltixInput
        label="Email Address"
        icon={Mail}
        placeholder="name@example.com"
        type="email"
        value={loginData.email}
        onChange={(e) =>
          setLoginData({ ...loginData, email: e.target.value })
        }
        error={errors.email}
      />

      <SoltixInput
        label="Password"
        icon={Lock}
        placeholder="••••••••"
        type="password"
        value={loginData.password}
        onChange={(e) =>
          setLoginData({ ...loginData, password: e.target.value })
        }
        error={errors.password}
      />

      
      <button
        type="submit"
        className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-700 shadow-[0_0_20px_rgba(124,58,237,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 mt-3"
      >
        Sign In
      </button>
    </motion.form>
  ) : (
    <motion.form
      key="register"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      onSubmit={handleRegister}
    >
      
      <div className="space-y-1 mb-2">
        <h2 className="text-2xl font-semibold text-white">
          Create account
        </h2>
        <p className="text-gray-400 text-sm">
          Join the future of blockchain ticketing.
        </p>
      </div>

      
      <SoltixInput
        label="Username"
        icon={User}
        placeholder="soltix_user"
        type="text"
        value={registerData.username}
        onChange={(e) =>
          setRegisterData({
            ...registerData,
            username: e.target.value,
          })
        }
        error={errors.username}
      />

      <SoltixInput
        label="Email Address"
        icon={Mail}
        placeholder="name@example.com"
        type="email"
        value={registerData.email}
        onChange={(e) =>
          setRegisterData({
            ...registerData,
            email: e.target.value,
          })
        }
        error={errors.email}
      />

      <SoltixInput
        label="Password"
        icon={Lock}
        placeholder="••••••••"
        type="password"
        value={registerData.password}
        onChange={(e) =>
          setRegisterData({
            ...registerData,
            password: e.target.value,
          })
        }
        error={errors.password}
      />

      <SoltixInput
        label="Confirm Password"
        icon={ShieldCheck}
        placeholder="••••••••"
        type="password"
        value={registerData.confirmPassword}
        onChange={(e) =>
          setRegisterData({
            ...registerData,
            confirmPassword: e.target.value,
          })
        }
        error={errors.confirmPassword}
      />

      
      <button
        type="submit"
        className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-700 shadow-[0_0_20px_rgba(124,58,237,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 mt-3"
      >
        Create Account
      </button>
    </motion.form>
  )}
</AnimatePresence>
          <p className="text-center text-muted-foreground text-xs mt-8">
            By continuing, you agree to Soltix's{" "}
            <span className="text-white/70 underline cursor-pointer hover:text-white transition-colors">
              Terms of Service
            </span>
            .
          </p>
        </div>
      </motion.div>
    </main>
  );
}