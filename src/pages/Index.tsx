
import { useState } from "react";
import { Automaton, TestResult } from "@/types/types";
import { AutomatonBuilder } from "@/lib/AutomatonBuilder";
import RegexInput from "@/components/RegexInput";
import AutomatonVisualizer from "@/components/AutomatonVisualizer";
import TestStringChecker from "@/components/TestStringChecker";
import { toast } from "@/components/ui/use-toast";
import { Check, X } from "lucide-react"; // Added this import for the icons

const Index = () => {
  const [automaton, setAutomaton] = useState<Automaton | null>(null);
  const [regex, setRegex] = useState<string>("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const automatonBuilder = new AutomatonBuilder();

  const handleConvert = (regexInput: string) => {
    try {
      const newAutomaton = automatonBuilder.buildNFA(regexInput);
      setAutomaton(newAutomaton);
      setRegex(regexInput);
      setTestResult(null);
      toast({
        title: "Automaton Generated",
        description: `Successfully converted regex "${regexInput}" to an NFA`,
      });
    } catch (error) {
      console.error("Error building automaton:", error);
      toast({
        variant: "destructive",
        title: "Conversion Failed",
        description: "Failed to convert the regular expression to an automaton",
      });
    }
  };

  const handleReset = () => {
    setAutomaton(null);
    setRegex("");
    setTestResult(null);
  };

  const handleTestString = (input: string) => {
    if (!automaton) return;
    
    try {
      const result = automatonBuilder.testString(automaton, input);
      setTestResult(result);
      
      toast({
        title: result.accepted ? "String Accepted" : "String Rejected",
        description: `The string "${input}" is ${result.accepted ? "accepted" : "rejected"} by the automaton`,
        variant: result.accepted ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error testing string:", error);
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: "Failed to test the input string",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-automaton-primary mb-2 animate-fade-in">
            Regex to Finite Automata Visualizer
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Convert regular expressions to finite automata and test strings against them
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <RegexInput onConvert={handleConvert} onReset={handleReset} />
          </div>
          <div>
            <TestStringChecker automaton={automaton} onTestString={handleTestString} />
          </div>
        </div>

        <div className="mb-6">
          <AutomatonVisualizer automaton={automaton} testResult={testResult} />
        </div>

        {testResult && (
          <div className="mt-4 p-4 rounded-lg bg-white shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {testResult.accepted ? (
                  <div className="flex items-center text-green-600">
                    <Check className="mr-2 h-5 w-5" />
                    <span className="font-medium">String Accepted</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-500">
                    <X className="mr-2 h-5 w-5" />
                    <span className="font-medium">String Rejected</span>
                  </div>
                )}
              </div>
              {regex && (
                <div className="text-sm text-gray-500">
                  Regex: <span className="font-mono">{regex}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>Theory of Automata Project: Regex to Finite Automaton Visualizer</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
