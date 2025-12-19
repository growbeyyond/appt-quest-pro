import { Check, X } from "lucide-react";
import { useMemo } from "react";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export const validatePassword = (password: string) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isValid = Object.values(requirements).every(Boolean);
  const strength = Object.values(requirements).filter(Boolean).length;

  return { requirements, isValid, strength };
};

export const PasswordStrengthIndicator = ({
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) => {
  const { requirements, strength } = useMemo(
    () => validatePassword(password),
    [password]
  );

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = [
    "bg-destructive",
    "bg-destructive",
    "bg-warning",
    "bg-success/70",
    "bg-success",
  ];

  const requirementsList: PasswordRequirement[] = [
    { label: "At least 8 characters", met: requirements.minLength },
    { label: "One uppercase letter (A-Z)", met: requirements.hasUppercase },
    { label: "One lowercase letter (a-z)", met: requirements.hasLowercase },
    { label: "One number (0-9)", met: requirements.hasNumber },
    { label: "One special character (!@#$%^&*)", met: requirements.hasSpecial },
  ];

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                level <= strength ? strengthColors[strength - 1] : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Password strength:{" "}
          <span
            className={`font-medium ${
              strength <= 2
                ? "text-destructive"
                : strength <= 3
                ? "text-warning"
                : "text-success"
            }`}
          >
            {strengthLabels[strength - 1] || "Very Weak"}
          </span>
        </p>
      </div>

      {/* Requirements list */}
      {showRequirements && (
        <ul className="space-y-1">
          {requirementsList.map((req) => (
            <li
              key={req.label}
              className={`flex items-center gap-2 text-xs transition-colors ${
                req.met ? "text-success" : "text-muted-foreground"
              }`}
            >
              {req.met ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {req.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
