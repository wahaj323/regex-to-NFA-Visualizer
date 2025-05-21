
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle } from "lucide-react";

interface RegexInputProps {
  onConvert: (regex: string) => void;
  onReset: () => void;
}

const RegexInput = ({ onConvert, onReset }: RegexInputProps) => {
  const [regex, setRegex] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleConvert = () => {
    if (!regex.trim()) {
      setError("Please enter a regular expression");
      return;
    }

    try {
      // Basic validation - check for unbalanced parentheses
      let parenthesisCount = 0;
      for (const char of regex) {
        if (char === '(') parenthesisCount++;
        else if (char === ')') parenthesisCount--;
        
        if (parenthesisCount < 0) {
          setError("Unbalanced parentheses in expression");
          return;
        }
      }
      
      if (parenthesisCount !== 0) {
        setError("Unbalanced parentheses in expression");
        return;
      }

      setError("");
      onConvert(regex.trim());
    } catch (err) {
      setError("Invalid regular expression");
    }
  };

  const handleReset = () => {
    setRegex("");
    setError("");
    onReset();
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-automaton-primary">
          Regular Expression Input
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="regex-input" className="text-sm font-medium">
              Enter Regular Expression:
            </label>
            <div className="flex gap-2">
              <Input
                id="regex-input"
                value={regex}
                onChange={(e) => setRegex(e.target.value)}
                placeholder="e.g., a*b, (a|b)*abb"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500">
              Supported operators: * (star), | (union), () (grouping)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={handleConvert} className="flex-1">
              <Check className="mr-2 h-4 w-4" />
              Convert to Automaton
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RegexInput;
