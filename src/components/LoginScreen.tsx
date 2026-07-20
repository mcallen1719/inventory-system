/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import logoUrl from "../assets/images/printopia_logo_1783376948226.jpg";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight,
  HelpCircle,
  Mail,
  BarChart3,
  Shield,
  Fingerprint,
  ArrowRight,
  Layers
} from "lucide-react";
import { UserRole } from "../types";
import { DBStore } from "../dbStore";
import LegalModal from "./LegalModal";

interface LoginScreenProps {
  onLogin: (role: UserRole, name: string) => void;
  isDarkMode: boolean;
}

export default function LoginScreen({ onLogin, isDarkMode }: LoginScreenProps) {
  // Input states
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Focus states for input styling
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Legal Modal states
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<"privacy" | "terms">("privacy");

  // Flow states
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [forgotActive, setForgotActive] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  
  // Custom auth loader stages for high-fidelity simulation
  const [loaderStage, setLoaderStage] = useState(0);

  // Shake animation triggers on incorrect submit
  const [shakeTrigger, setShakeTrigger] = useState(false);

  // Animated background particles
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Track mouse for subtle parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Handle standard credential verification
  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const inputVal = emailOrUsername.trim().toLowerCase();
    const passwordVal = password;

    if (!inputVal || !passwordVal) {
      setErrorMsg("Please enter your username and password.");
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      return;
    }

    setIsLoading(true);
    setLoaderStage(0);

    // High fidelity loading stages simulator
    const stageTimer1 = setTimeout(() => setLoaderStage(1), 300);
    const stageTimer2 = setTimeout(() => setLoaderStage(2), 650);
    const stageTimer3 = setTimeout(() => setLoaderStage(3), 950);

    // Verify credentials after simulation
    setTimeout(() => {
      const accounts = DBStore.getStaffAccounts();

      // Match by username (or email-style aliases) and password. The staff
      // account "name" is treated as their canonical terminal/display name.
      const match = accounts.find(acc => {
        const u = acc.username.toLowerCase();
        const isUser =
          inputVal === u ||
          inputVal === `${u}@printopia.com` ||
          inputVal === `${u}@printopiadigitalpress.com`;
        return isUser && passwordVal === acc.passwordText;
      });

      const isA = inputVal === "isaah boadu jnr" || inputVal === "admin";
      const adminPass = "zhaogangren04@";

      if (isA && passwordVal === adminPass) {
        setIsLoading(false);
        setIsSuccess(true);
        setTimeout(() => {
          onLogin(UserRole.ADMIN, "Isaah Boadu Jnr");
        }, 1000);
      } else if (match) {
        setIsLoading(false);
        setIsSuccess(true);
        const terminalName = match.name && match.name.trim() ? match.name : match.username;
        setTimeout(() => {
          onLogin(UserRole.STAFF, terminalName);
        }, 1000);
      } else {
        clearTimeout(stageTimer1);
        clearTimeout(stageTimer2);
        clearTimeout(stageTimer3);
        setIsLoading(false);
        setErrorMsg("Invalid credentials. Please check your username and password.");
        setShakeTrigger(true);
        setTimeout(() => setShakeTrigger(false), 500);
      }
    }, 1300);
  };

  // Simulate Password Recovery flow
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!emailOrUsername.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotActive(false);
      setForgotSuccess(false);
    }, 3500);
  };

  const loaderMessages = [
    "Connecting securely...",
    "Verifying credentials...",
    "Loading workspace...",
    "Almost there..."
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-sans relative overflow-hidden transition-colors duration-500"
      style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 35%, #312E81 60%, #1E293B 100%)"
      }}
    >
      
      {/* ================= ANIMATED BACKGROUND LAYERS ================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        
        {/* Animated Gradient Orbs */}
        <motion.div 
          className="absolute w-[800px] h-[800px] rounded-full blur-[180px] opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)",
            top: "-20%",
            left: "-15%",
          }}
          animate={{ 
            x: mousePos.x * 0.5, 
            y: mousePos.y * 0.5,
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            x: { duration: 0.8, ease: "easeOut" },
            y: { duration: 0.8, ease: "easeOut" },
            scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        <motion.div 
          className="absolute w-[700px] h-[700px] rounded-full blur-[160px] opacity-25"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, transparent 70%)",
            bottom: "-25%",
            right: "-10%",
          }}
          animate={{ 
            x: mousePos.x * -0.3, 
            y: mousePos.y * -0.3,
            scale: [1, 1.15, 1],
          }}
          transition={{ 
            x: { duration: 0.8, ease: "easeOut" },
            y: { duration: 0.8, ease: "easeOut" },
            scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        <motion.div 
          className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)",
            top: "40%",
            right: "20%",
          }}
          animate={{ 
            scale: [1, 1.2, 1],
          }}
          transition={{ 
            duration: 12, repeat: Infinity, ease: "easeInOut"
          }}
        />

        {/* Subtle dot matrix grid */}
        <div 
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(99, 102, 241, 0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-indigo-400/40"
            style={{
              top: `${15 + i * 15}%`,
              left: `${10 + i * 14}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 4 + i * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* ================= MAIN LOGIN CARD ================= */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-5xl mx-4 grid grid-cols-1 lg:grid-cols-2 overflow-hidden z-10"
        style={{
          borderRadius: "28px",
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(40px) saturate(150%)",
          WebkitBackdropFilter: "blur(40px) saturate(150%)",
          border: "1px solid rgba(99, 102, 241, 0.12)",
          boxShadow: "0 0 80px rgba(99, 102, 241, 0.06), 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Top accent gradient bar */}
        <div className="col-span-2 h-[3px]" style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6, #06B6D4, #6366F1)" }} />

        {/* ================= LEFT: BRANDING & FEATURES ================= */}
        <div className="p-10 sm:p-12 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/[0.07] via-transparent to-violet-600/[0.05] pointer-events-none" />

          {/* TOP: Logo & Brand */}
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05, rotate: 3 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="h-14 w-14 rounded-2xl bg-white p-1.5 shadow-[0_0_30px_rgba(99,102,241,0.2)] border border-white/30 overflow-hidden flex items-center justify-center">
                  <img src={logoUrl} alt="Printopia Logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 border-2 border-slate-900 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
              </motion.div>
              
              <div>
                <h2 className="text-xl font-black tracking-tight text-white leading-none">
                  Printopia
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase">
                    Digital Press
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">v2.0</span>
                </div>
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight mb-3">
              Welcome back to your <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">workspace</span>
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Access your inventory dashboard, manage print jobs, track materials, and collaborate with your team — all in one place.
            </p>
          </div>

          {/* CENTER: Feature highlights */}
          <div className="my-8 space-y-4 relative z-10">
            {[
              { icon: Layers, title: "Smart Inventory", desc: "Real-time SKU tracking & alerts", color: "from-indigo-500 to-blue-500" },
              { icon: Shield, title: "Enterprise Security", desc: "AES-256 encrypted data at rest", color: "from-violet-500 to-purple-500" },
              { icon: BarChart3, title: "Analytics Dashboard", desc: "Live reports & trend insights", color: "from-cyan-500 to-teal-500" },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.15, duration: 0.5 }}
                className="flex items-center gap-4 group"
              >
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{feature.title}</h4>
                  <p className="text-xs text-slate-400">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* BOTTOM: Trust badges */}
          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono relative z-10 select-none">
            <div className="flex items-center gap-1.5 bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-700/50">
              <Fingerprint className="h-3 w-3 text-indigo-400" />
              <span>Biometric Ready</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-700/50">
              <Shield className="h-3 w-3 text-emerald-400" />
              <span>SOC 2 Compliant</span>
            </div>
          </div>

        </div>

        {/* ================= RIGHT: LOGIN FORM ================= */}
        <div className="p-10 sm:p-12 flex flex-col justify-center relative">
          
          {/* Subtle gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-bl from-indigo-600/[0.04] via-transparent to-transparent pointer-events-none" />

          <div className="space-y-6 relative z-10 max-w-sm mx-auto w-full">
            
            {/* Form Header */}
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
                Sign In
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Enter your credentials to access the dashboard.
              </p>
            </div>

            {/* Alerts Container (Success / Error states) */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  className="rounded-xl p-3 flex gap-2.5 text-xs leading-relaxed font-medium"
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    color: "#FCA5A5",
                  }}
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" style={{ color: "#F87171" }} />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {forgotSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-xl p-3.5 flex gap-2.5 text-xs leading-relaxed font-medium"
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    color: "#6EE7B7",
                  }}
                >
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#34D399" }} />
                  <span>Password reset link sent to your email. Check your inbox.</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interactive Forms container */}
            <motion.div
              animate={shakeTrigger ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {!forgotActive ? (
                <form onSubmit={handleFormLogin} className="space-y-5">
                  
                  {/* USERNAME / EMAIL INPUT */}
                  <div className="space-y-2">
                    <label className={`block text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300 ${isEmailFocused ? "text-indigo-400" : "text-slate-400"}`}>
                      Username or Email
                    </label>
                    <div 
                      className="relative rounded-xl overflow-hidden transition-all duration-300"
                      style={{
                        background: "rgba(30, 41, 59, 0.6)",
                        border: isEmailFocused ? "1px solid rgba(99, 102, 241, 0.5)" : "1px solid rgba(51, 65, 85, 0.5)",
                        boxShadow: isEmailFocused ? "0 0 0 3px rgba(99, 102, 241, 0.1), 0 0 20px rgba(99, 102, 241, 0.08)" : "none",
                      }}
                    >
                      <span className={`absolute inset-y-0 left-0 flex items-center pl-3.5 transition-colors duration-300 ${isEmailFocused ? "text-indigo-400" : "text-slate-500"}`}>
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        onFocus={() => setIsEmailFocused(true)}
                        onBlur={() => setIsEmailFocused(false)}
                        placeholder="e.g. admin or staff1"
                        className="w-full text-sm pl-10 pr-4 py-3.5 text-white bg-transparent outline-none font-medium placeholder-slate-600"
                        disabled={isLoading || isSuccess}
                      />
                      {/* Active underline */}
                      <div className={`absolute bottom-0 left-0 h-[2px] transition-all duration-500 ${isEmailFocused ? "w-full" : "w-0"}`} style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6)" }} />
                    </div>
                  </div>

                  {/* PASSWORD INPUT */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className={`block text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300 ${isPasswordFocused ? "text-indigo-400" : "text-slate-400"}`}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg("");
                          setForgotActive(true);
                        }}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer bg-transparent border-none p-0"
                        disabled={isLoading || isSuccess}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div 
                      className="relative rounded-xl overflow-hidden transition-all duration-300"
                      style={{
                        background: "rgba(30, 41, 59, 0.6)",
                        border: isPasswordFocused ? "1px solid rgba(99, 102, 241, 0.5)" : "1px solid rgba(51, 65, 85, 0.5)",
                        boxShadow: isPasswordFocused ? "0 0 0 3px rgba(99, 102, 241, 0.1), 0 0 20px rgba(99, 102, 241, 0.08)" : "none",
                      }}
                    >
                      <span className={`absolute inset-y-0 left-0 flex items-center pl-3.5 transition-colors duration-300 ${isPasswordFocused ? "text-indigo-400" : "text-slate-500"}`}>
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                        placeholder="••••••••"
                        className="w-full text-sm pl-10 pr-11 py-3.5 text-white bg-transparent outline-none font-medium placeholder-slate-600"
                        disabled={isLoading || isSuccess}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-white cursor-pointer transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      {/* Active underline */}
                      <div className={`absolute bottom-0 left-0 h-[2px] transition-all duration-500 ${isPasswordFocused ? "w-full" : "w-0"}`} style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6)" }} />
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-600 h-4 w-4 cursor-pointer accent-indigo-500 transition-all"
                      />
                      <span className="text-slate-400 font-medium select-none group-hover:text-slate-200 transition-colors text-[11px]">
                        Remember me
                      </span>
                    </label>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading || isSuccess}
                    className="w-full relative group overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl text-white py-4 px-4 text-sm font-bold tracking-wide transition-all duration-300 cursor-pointer active:scale-[0.99]"
                    style={{
                      background: isSuccess 
                        ? "linear-gradient(135deg, #10B981, #059669)" 
                        : "linear-gradient(135deg, #6366F1, #8B5CF6, #6366F1)",
                      backgroundSize: "200% 200%",
                      boxShadow: isSuccess
                        ? "0 10px 25px -5px rgba(16, 185, 129, 0.3)"
                        : "0 10px 25px -5px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.1)",
                    }}
                  >
                    {/* Reflective sweep light */}
                    <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 -left-[100%] animate-sweep pointer-events-none z-10" />

                    {isLoading ? (
                      <span className="flex items-center gap-2.5">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-xs font-medium">
                          {loaderMessages[loaderStage]}
                        </span>
                      </span>
                    ) : isSuccess ? (
                      <span className="flex items-center gap-1.5 text-white font-bold">
                        <CheckCircle className="h-5 w-5" /> Welcome! Redirecting...
                      </span>
                    ) : (
                      <>
                        <span className="relative z-20">Sign In</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform relative z-20" />
                      </>
                    )}
                  </button>

                </form>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div 
                    className="rounded-xl p-4 text-xs text-slate-400 leading-relaxed font-medium"
                    style={{
                      background: "rgba(30, 41, 59, 0.4)",
                      border: "1px solid rgba(51, 65, 85, 0.4)",
                    }}
                  >
                    Enter the email associated with your account and we'll send you a password reset link.
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div 
                      className="relative rounded-xl overflow-hidden"
                      style={{
                        background: "rgba(30, 41, 59, 0.6)",
                        border: "1px solid rgba(51, 65, 85, 0.5)",
                      }}
                    >
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input
                        type="email"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        placeholder="e.g. admin@printopia.com"
                        className="w-full text-sm pl-10 pr-4 py-3.5 text-white bg-transparent outline-none font-medium placeholder-slate-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg("");
                        setForgotActive(false);
                      }}
                      className="flex-1 rounded-xl py-3.5 text-xs font-bold text-slate-400 tracking-wider hover:text-white transition-all cursor-pointer"
                      style={{
                        background: "rgba(30, 41, 59, 0.4)",
                        border: "1px solid rgba(51, 65, 85, 0.5)",
                      }}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      className="flex-1 rounded-xl text-white py-3.5 text-xs font-bold tracking-wider transition-all cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                        boxShadow: "0 8px 20px -4px rgba(99, 102, 241, 0.3)",
                      }}
                    >
                      Send Reset Link
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>

          {/* BOTTOM FOOTER */}
          <div className="pt-8 text-[10px] text-slate-500 flex flex-wrap justify-between items-center gap-3 font-medium mt-auto select-none relative z-10 max-w-sm mx-auto w-full">
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => { setLegalTab("privacy"); setIsLegalOpen(true); }}
                className="hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit text-[10px]"
              >
                Privacy Policy
              </button>
              <span className="text-slate-700">|</span>
              <button 
                type="button" 
                onClick={() => { setLegalTab("terms"); setIsLegalOpen(true); }}
                className="hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit text-[10px]"
              >
                Terms of Service
              </button>
            </div>
            <span>© 2026 Printopia</span>
          </div>

        </div>

      </motion.div>

      {/* GLOBAL LEGAL MODAL */}
      <LegalModal 
        isOpen={isLegalOpen} 
        onClose={() => setIsLegalOpen(false)} 
        defaultTab={legalTab} 
      />

    </div>
  );
}
