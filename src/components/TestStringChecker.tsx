import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Automaton, TestResult } from "@/types/types";
import { Check, X, ArrowRight, Zap } from "lucide-react";

interface TestStringCheckerProps {
  automaton: Automaton | null;
  onTestString: (input: string) => void;
}

const TestStringChecker = ({ automaton, onTestString }: TestStringCheckerProps) => {
  const [testString, setTestString] = useState<string>("");
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTestString = () => {
    onTestString(testString);
  };

  const handleTestEmptyString = () => {
    setTestString("");
    onTestString("");
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-automaton-primary">
          Test String Validator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="test-string-input" className="text-sm font-medium">
              Enter Test String:
            </label>
            <div className="flex gap-2">
              <Input
                id="test-string-input"
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                placeholder="e.g., abb (leave empty for ε)"
                className="flex-1"
                disabled={!automaton}
              />
              <Button 
                onClick={handleTestString}
                disabled={!automaton}
                className="px-6"
              >
                Test <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Empty String Test Button */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleTestEmptyString}
              disabled={!automaton}
              variant="outline"
              className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <Zap className="h-4 w-4" />
              Test Empty String (ε)
            </Button>
            <span className="text-sm text-gray-500">
              Test if empty string is accepted via epsilon transitions
            </span>
          </div>
          
          {/* Current Test Display */}
          {testString === "" ? (
            <div className="text-sm text-purple-600 bg-purple-50 p-2 rounded-md border border-purple-200">
              <strong>Current Test:</strong> Empty String (ε) - Testing epsilon transitions only
            </div>
          ) : (
            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded-md border border-blue-200">
              <strong>Current Test:</strong> "{testString}"
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TestStringChecker;