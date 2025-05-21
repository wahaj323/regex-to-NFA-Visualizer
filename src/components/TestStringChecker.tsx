
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Automaton, TestResult } from "@/types/types";
import { Check, X, ArrowRight } from "lucide-react";

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
                placeholder="e.g., abb"
                className="flex-1"
                disabled={!automaton}
              />
              <Button 
                onClick={handleTestString}
                disabled={!automaton || !testString}
                className="px-6"
              >
                Test <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestStringChecker;
