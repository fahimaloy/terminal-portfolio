import Head from 'next/head';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';

type LoginStatus = 'idle' | 'loading' | 'success' | 'error';

interface ValidationErrors {
  username?: string;
  password?: string;
}

const LoginPage = () => {
  const router = useRouter();
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [touched, setTouched] = useState<{
    username: boolean;
    password: boolean;
  }>({
    username: false,
    password: false,
  });
  const [shakeKey, setShakeKey] = useState(0);

  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 30;

  // Initialize lock state from localStorage
  useEffect(() => {
    try {
      const lockData = localStorage.getItem('admin_login_lock');
      if (lockData) {
        const { until } = JSON.parse(lockData);
        if (Date.now() < until) {
          setIsLocked(true);
          setLockTimer(Math.ceil((until - Date.now()) / 1000));
        } else {
          localStorage.removeItem('admin_login_lock');
        }
      }
    } catch {
      localStorage.removeItem('admin_login_lock');
    }
  }, []);

  // Lock timer countdown
  useEffect(() => {
    if (!isLocked || lockTimer <= 0) return;

    const interval = setInterval(() => {
      setLockTimer((prev) => {
        if (prev <= 1) {
          setIsLocked(false);
          localStorage.removeItem('admin_login_lock');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked]);

  // Validate inputs in real-time
  const validateField = useCallback(
    (field: 'username' | 'password', value: string): string | undefined => {
      const trimmed = value.trim();

      if (field === 'username') {
        if (!trimmed) return 'Username is required';
        if (trimmed.length < 2) return 'Username must be at least 2 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed))
          return 'Username can only contain letters, numbers, and underscores';
      }

      if (field === 'password') {
        if (!trimmed) return 'Password is required';
        if (trimmed.length < 1) return 'Password cannot be empty';
      }

      return undefined;
    },
    [],
  );

  // Update validation errors when inputs change
  useEffect(() => {
    if (touched.username) {
      setValidationErrors((prev) => ({
        ...prev,
        username: validateField('username', username),
      }));
    }
  }, [username, touched.username, validateField]);

  useEffect(() => {
    if (touched.password) {
      setValidationErrors((prev) => ({
        ...prev,
        password: validateField('password', password),
      }));
    }
  }, [password, touched.password, validateField]);

  const triggerShake = () => {
    setShakeKey((prev) => prev + 1);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked || status === 'loading') return;

    // Validate all fields before submission
    const usernameError = validateField('username', username);
    const passwordError = validateField('password', password);

    setValidationErrors({
      username: usernameError,
      password: passwordError,
    });
    setTouched({ username: true, password: true });

    if (usernameError || passwordError) {
      setStatus('error');
      triggerShake();
      return;
    }

    setErrorMessage('');
    setStatus('loading');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result?.ok) {
        setStatus('success');
        setAttempts(0);

        // Clear stored attempts
        try {
          localStorage.removeItem('admin_login_attempts');
        } catch {
          // Ignore storage errors
        }

        // Smooth transition to dashboard
        setTimeout(() => {
          setUsername('');
          setPassword('');
          router.push('/sudosuperuser-ostaad');
        }, 800);
      } else {
        // Use functional update to avoid race condition
        setAttempts((prevAttempts) => {
          const newAttempts = prevAttempts + 1;

          if (newAttempts >= MAX_ATTEMPTS) {
            const lockUntil = Date.now() + LOCK_DURATION * 1000;
            try {
              localStorage.setItem(
                'admin_login_lock',
                JSON.stringify({ until: lockUntil }),
              );
            } catch {
              // Ignore
            }
            setIsLocked(true);
            setLockTimer(LOCK_DURATION);
            setErrorMessage(
              `Too many failed attempts. Locked for ${LOCK_DURATION} seconds.`,
            );
          } else {
            const remaining = MAX_ATTEMPTS - newAttempts;
            setErrorMessage(
              result?.message ||
                `Invalid credentials. ${remaining} attempt${
                  remaining !== 1 ? 's' : ''
                } remaining.`,
            );
          }

          return newAttempts;
        });

        setStatus('error');
        triggerShake();

        // Clear password on failed attempt for security
        setPassword('');

        // Focus back on username
        usernameInputRef.current?.focus();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Login error:', err);
      setErrorMessage(
        'Network error. Please check your connection and try again.',
      );
      setStatus('error');
      triggerShake();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && status !== 'loading' && !isLocked) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const handleBlur = (field: 'username' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFocusedField(null);
  };

  const getInputClasses = (
    fieldName: 'username' | 'password',
    hasError: boolean,
  ) => {
    const baseClasses =
      'w-full px-4 py-3 bg-white/5 border-2 border-gray-700 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed rounded-xl';

    if (hasError && touched[fieldName]) {
      return `${baseClasses} border-red-500 focus:border-red-400 focus:bg-red-950/30 text-red-400`;
    }

    if (focusedField === fieldName) {
      return `${baseClasses} border-purple-500 bg-purple-950/30 text-white`;
    }

    return `${baseClasses} border-gray-700 hover:border-gray-600 focus:border-purple-500 focus:bg-purple-950/20`;
  };

  const isFormValid =
    !validationErrors.username &&
    !validationErrors.password &&
    username.trim() &&
    password;

  return (
    <>
      <Head>
        <title>Admin Login | Portfolio CMS</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Secure admin access to portfolio management system"
        />
      </Head>

      <div className="min-h-screen bg-[#0a0a0f] text-white font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '2s' }}
          />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 filter drop-shadow-lg animate-float">
              {status === 'success' ? '🎉' : status === 'error' ? '⚠️' : '🔐'}
            </div>
            <h1 className="text-3xl font-bold mb-2 tracking-wider">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                Admin Access
              </span>
            </h1>
            <p className="text-gray-500 text-sm">
              Secure Portfolio Management
            </p>
          </div>

          {/* Login Card */}
          <div
            key={shakeKey}
            className="glass-deep rounded-xl overflow-hidden shadow-2xl transition-transform"
            style={{
              animation: status === 'error' ? 'shake 0.5s ease-in-out' : 'none',
            }}
          >
            {/* Status Bar */}
            <div
              className={`h-1 transition-all duration-500 ${
                status === 'loading'
                  ? 'bg-yellow-400 animate-pulse'
                  : status === 'success'
                  ? 'bg-lime-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]'
                  : status === 'error'
                  ? 'bg-red-500 animate-pulse'
                  : 'bg-purple-600'
              }`}
            />

            <div className="p-8">
              {/* Error Message */}
              {errorMessage && (
                <div
                  className="mb-6 p-4 bg-red-950/30 border border-red-500/30 rounded-xl text-red-300 text-sm animate-fade-in"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <div className="font-bold mb-1">
                        Authentication Failed
                      </div>
                      <div>{errorMessage}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {status === 'success' && (
                <div className="mb-6 p-4 bg-lime-500/10 border border-lime-500/30 rounded-xl text-lime-400 text-sm animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="text-lg animate-bounce">✓</span>
                    <div>
                      <div className="font-bold">Access Granted</div>
                      <div className="text-lime-400/70">
                        Redirecting to dashboard...
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lockout Message */}
              {isLocked && (
                <div className="mb-6 p-4 bg-yellow-950/30 border border-yellow-500/30 rounded-xl text-yellow-300 text-sm animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="text-lg animate-pulse">🔒</span>
                    <div>
                      <div className="font-bold">
                        Account Temporarily Locked
                      </div>
                      <div>
                        Please wait{' '}
                        <span className="font-mono font-bold">{lockTimer}</span>{' '}
                        seconds before retrying.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form
                ref={formRef}
                onSubmit={handleLogin}
                className="space-y-5"
                noValidate
              >
                {/* Username Field */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-300"
                  >
                    <span>👤</span>
                    <span>Username</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    ref={usernameInputRef}
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => handleBlur('username')}
                    onKeyDown={handleKeyDown}
                    disabled={status === 'loading' || isLocked}
                    className={getInputClasses(
                      'username',
                      !!validationErrors.username,
                    )}
                    placeholder="Enter your username"
                    autoComplete="username"
                    aria-invalid={
                      touched.username && !!validationErrors.username
                    }
                    aria-describedby={
                      validationErrors.username ? 'username-error' : undefined
                    }
                    autoFocus
                  />
                  {/* Real-time validation feedback */}
                  {touched.username && validationErrors.username && (
                    <p
                      id="username-error"
                      className="mt-1 text-xs text-red-400 flex items-center gap-1 animate-fade-in"
                    >
                      <span>⚠️</span> {validationErrors.username}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-300"
                  >
                    <span>🔑</span>
                    <span>Password</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => handleBlur('password')}
                      onKeyDown={handleKeyDown}
                      disabled={status === 'loading' || isLocked}
                      className={`${getInputClasses(
                        'password',
                        !!validationErrors.password,
                      )} pr-12`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      aria-invalid={
                        touched.password && !!validationErrors.password
                      }
                      aria-describedby={
                        validationErrors.password ? 'password-error' : undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={status === 'loading' || isLocked}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                            clipRule="evenodd"
                          />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {touched.password && validationErrors.password && (
                    <p
                      id="password-error"
                      className="mt-1 text-xs text-red-400 flex items-center gap-1 animate-fade-in"
                    >
                      <span>⚠️</span> {validationErrors.password}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    status === 'loading' || status === 'success' || isLocked
                  }
                  className={`w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-lg ${
                    status === 'loading' ? 'animate-pulse' : ''
                  }`}
                  aria-busy={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Authenticating...</span>
                    </>
                  ) : status === 'success' ? (
                    <>
                      <span className="animate-bounce">✓</span>
                      <span>Success!</span>
                    </>
                  ) : isLocked ? (
                    <>
                      <span>🔒</span>
                      <span>Locked ({lockTimer}s)</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Login</span>
                    </>
                  )}
                </button>
              </form>

              {/* Attempts indicator */}
              {attempts > 0 && !isLocked && (
                <div className="mt-4 text-center">
                  <div className="flex justify-center gap-1">
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i < MAX_ATTEMPTS - attempts
                            ? 'bg-purple-400 shadow-[0_0_5px_rgba(139,92,246,0.5)]'
                            : 'bg-red-500/30'
                        }`}
                        aria-label={`Attempt ${i + 1} of ${MAX_ATTEMPTS}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {MAX_ATTEMPTS - attempts} attempt
                    {MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining
                  </p>
                </div>
              )}

              {/* Security Notice */}
              <div className="mt-6 pt-6 border-t border-gray-800/50">
                <div className="flex items-start gap-3 text-xs text-gray-500">
                  <span className="text-lg flex-shrink-0">🛡️</span>
                  <div>
                    <div className="font-bold mb-1 text-gray-400">
                      Secure Connection
                    </div>
                    <p>
                      All authentication attempts are logged and monitored.
                      Multiple failed attempts will result in temporary
                      lockouts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 bg-lime-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(74,222,128,0.5)]" />
              <span>System Online</span>
            </div>
            <code className="text-gray-600">
              $ sudo access-portfolio --admin
            </code>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-5px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(5px);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default LoginPage;
