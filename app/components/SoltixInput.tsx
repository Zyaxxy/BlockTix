import { useState } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";

interface SoltixInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

export const SoltixInput = ({
  label,
  icon: Icon,
  error,
  type,
  ...props
}: SoltixInputProps) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-2 w-full">
      
      <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">
        {label}
      </label>

      
      <div className="relative group">
        
        
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-400 transition-colors">
          <Icon size={18} />
        </div>

        
        <input
          {...props}
          type={isPassword ? (show ? "text" : "password") : type}
          className="w-full pl-12 pr-12 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all duration-300"
        />

        
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      
      {error && (
        <p className="text-xs text-red-400 ml-1">{error}</p>
      )}
    </div>
  );
};