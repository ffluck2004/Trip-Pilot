import { useState, FormEvent } from "react";
import { Compass, Mail, Lock, User, ArrowRight } from "lucide-react";
import { loginUser, registerUser } from '../api/authApi';
import { setToken } from '../api/client';

interface AuthScreenProps {
  onSuccess: (user: { id: string; email: string; name: string; role: string }) => void;
  onBypass: () => void;
}

export default function AuthScreen({ onSuccess, onBypass }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("guest@trippilot.com");
  const [password, setPassword] = useState("guest");
  const [name, setName] = useState("Amelia Earhart");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const data = isLogin
        ? await loginUser(email, password)
        : await registerUser(email, password, name, { styles: ["Adventure", "Photography"], interests: ["Nature", "Heritage"] });

      if (data.token) setToken(data.token);

      if (data.success) {
        onSuccess(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Credential verification failure.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col bg-[#FBFBF9] text-[#1A1A1A] overflow-y-auto">
      {/* Navy Hero (240px) */}
      <div className="h-[240px] w-full bg-gradient-to-b from-[#0B132B] to-[#1C2541] flex flex-col items-center justify-center p-6 relative text-white shrink-0">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#FFFFFF 0.8px, transparent 0.8px)", backgroundSize: "16px 16px" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B]/85 via-transparent to-transparent" />

        <div className="w-12 h-12 bg-gradient-to-tr from-[#F27D26] to-[#0D9488] rounded-full flex items-center justify-center p-0.5 shadow-md relative z-10 mb-2">
          <div className="w-full h-full bg-[#0B132B] rounded-full flex items-center justify-center">
            <Compass className="w-5 h-5 text-white rotate-[24deg]" />
          </div>
        </div>
        <h1 className="text-2xl font-serif italic font-bold tracking-tight text-white relative z-10 select-none">
          TripPilot Terminal
        </h1>
        <p className="text-[8px] text-teal-400 uppercase tracking-[0.25em] font-mono font-bold mt-1 relative z-10">
          SECURE CREDENTIAL VALIDATION
        </p>
      </div>

      {/* Auth Content */}
      <div className="flex-1 px-6 py-6 -mt-6 bg-[#FBFBF9] rounded-t-3xl relative z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        {/* Segmented tabs */}
        <div className="flex bg-[#1A1A1A]/5 rounded-xl p-1 mb-6 border border-[#1A1A1A]/5">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(""); }}
            className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              isLogin ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(""); }}
            className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              !isLogin ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 text-[11px] bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-bold text-[#1A1A1A]/70 uppercase tracking-widest mb-1.5">Full Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40"><User className="w-4 h-4" /></span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1A1A1A]/5 rounded-xl border border-transparent hover:border-[#1A1A1A]/10 py-3 pl-10 pr-4 text-xs focus:bg-white focus:border-[#F27D26] outline-none transition duration-200"
                  placeholder="Amelia Earhart"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-[#1A1A1A]/70 uppercase tracking-widest mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40"><Mail className="w-4 h-4" /></span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1A1A1A]/5 rounded-xl border border-transparent hover:border-[#1A1A1A]/10 py-3 pl-10 pr-4 text-xs focus:bg-white focus:border-[#F27D26] outline-none transition duration-200"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#1A1A1A]/70 uppercase tracking-widest mb-1.5">Secret Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40"><Lock className="w-4 h-4" /></span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1A1A1A]/5 rounded-xl border border-transparent hover:border-[#1A1A1A]/10 py-3 pl-10 pr-4 text-xs focus:bg-white focus:border-[#F27D26] outline-none transition duration-200"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F27D26] hover:bg-[#E06A1B] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#F27D26]/10"
            >
              {loading ? "Authenticating Session..." : isLogin ? "Initialize Pilot Account" : "Deploy Pilot Profile"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1A1A1A]/10"></div></div>
          <span className="relative px-3 bg-[#FBFBF9] text-[9px] uppercase font-mono tracking-wider text-[#1A1A1A]/40">or continue with</span>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={onBypass}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-[#F5F5F0] border border-[#1A1A1A]/10 rounded-xl text-xs font-sans font-bold transition duration-150 cursor-pointer text-[#1A1A1A]"
          >
            <span className="text-sm">🇬</span> Google
          </button>
          <button
            onClick={onBypass}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-xl text-xs font-sans font-bold text-white transition duration-150 cursor-pointer"
          >
            <span className="text-sm"></span> Apple
          </button>
        </div>

        {/* Bypass guest clicker */}
        <div className="text-center">
          <button
            onClick={onBypass}
            className="text-[11px] text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition underline decoration-dotted underline-offset-4"
          >
            Bypass to Quick Guest Entrance
          </button>
        </div>
      </div>
    </div>
  );
}
