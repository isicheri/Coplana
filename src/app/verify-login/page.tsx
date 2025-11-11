"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyLoginPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");

  useEffect(() => {
    if (code.every((digit) => digit !== "") && !loading) {
      verifyCode();
    }
  }, [code]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < code.length - 1) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    }
  };

  const verifyCode = async () => {
    if (!email) return;

    setLoading(true);
    setError("");
    const codeValue = code.join("");

    try {
      const res = await fetch("http://localhost:5000/api/v1/auth/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codeValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("❌ Verification failed:", data);
        setError(data.error || "Invalid code");
        setLoading(false);
        return;
      }

      // console.log("✅ Login success:", data);

      // Save token and user
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      router.push("/dashboard");
    } catch (err) {
      console.error("Error verifying login:", err);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!email) return;
    setResending(true);

    try {
      const res = await fetch("http://localhost:5000/api/v1/auth/resend-login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("📨 Code resent:", data);
      } else {
        console.log("❌ Resend failed:", data);
      }
    } catch (err) {
      console.error("Error resending code:", err);
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-700 flex flex-col gap-4 items-center justify-center text-white relative overflow-hidden">
        <div className="bubbles w-full h-full bg-cover bg-no-repeat mix-blend-screen bg-center fixed top-0 left-0"></div>

        <div className="relative z-10 flex flex-col items-center bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-2">Verify your login</h1>
          <p className="text-sm opacity-80 mb-6">{email}</p>

          <div className="flex gap-2 justify-center">
            {code.map((digit, i) => (
              <input
                key={i}
                id={`code-${i}`}
                type="text"
                value={digit}
                onChange={(e) => handleChange(e.target.value, i)}
                maxLength={1}
                disabled={loading}
                className={`w-12 h-14 text-center text-2xl font-semibold rounded-lg border-2 ${
                  error
                    ? "border-red-400 bg-red-100 text-red-700"
                    : "border-white bg-white/20 text-white"
                } focus:border-blue-300 focus:outline-none`}
              />
            ))}
          </div>

          {loading && (
            <div className="mt-6 animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
          )}

          {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}

          <button
            onClick={resendCode}
            disabled={resending}
            className="mt-8 text-sm text-white/80 hover:text-white underline"
          >
            {resending ? "Resending..." : "Resend code"}
          </button>
        </div>
      </main>
    </>
  );
}
