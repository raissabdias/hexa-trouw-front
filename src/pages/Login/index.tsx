import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Truck, Lock, User, AlertCircle, ArrowRight } from "lucide-react";

const LoginPage: React.FC = () => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login: performLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await performLogin(login, password);
      navigate("/travel");
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 font-sans">
      {/* Visual Side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#2E3191] justify-center items-center">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 text-center px-12">
          <div className="mb-8 inline-flex p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <Truck size={64} className="text-white animate-pulse" />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            Travel <span className="text-blue-300">Hexa+</span>
          </h1>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-10 left-10 w-24 h-24 bg-white/5 rounded-full animate-bounce delay-700 blur-xl" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full animate-pulse blur-2xl" />
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden mb-6 flex justify-center">
              <div className="p-3 rounded-2xl bg-[#2E3191] shadow-xl shadow-blue-900/20">
                <Truck size={32} className="text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Bem-vindo</h2>
            <p className="text-zinc-500 mt-2">Acesse sua conta para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 ml-1">Usuário</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#2E3191] text-zinc-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Seu login"
                  className="block w-full pl-11 pr-4 py-4 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-2xl focus:ring-4 focus:ring-[#2E3191]/5 focus:border-[#2E3191] outline-none transition-all placeholder:text-zinc-400"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-[#2E3191] text-zinc-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-4 py-4 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-2xl focus:ring-4 focus:ring-[#2E3191]/5 focus:border-[#2E3191] outline-none transition-all placeholder:text-zinc-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative group w-full py-4 bg-[#2E3191] hover:bg-[#2E3191] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20 transition-all overflow-hidden flex items-center justify-center gap-2"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Acessar Painel
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pt-8 text-center border-t border-zinc-100">
            <p className="text-zinc-400 text-sm">
              Dashboard Hexa Power © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
