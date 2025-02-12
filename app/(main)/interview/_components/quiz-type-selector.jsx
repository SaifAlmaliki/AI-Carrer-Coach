"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function QuizTypeSelector({ type, onTypeChange }) {
  const quizTypes = [
    {
      id: "technical",
      label: "Technical",
      description: "Questions about technical skills and problem-solving",
    },
    {
      id: "behavioral",
      label: "Behavioral",
      description: "Questions about past experiences and work style",
    },
    {
      id: "leadership",
      label: "Leadership",
      description: "Questions about team management and decision making",
    },
  ];

  return (
    <RadioGroup value={type} onValueChange={onTypeChange} className="grid gap-4 md:grid-cols-3">
      {quizTypes.map((quizType) => (
        <div
          key={quizType.id}
          className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer"
        >
          <RadioGroupItem value={quizType.id} id={quizType.id} className="mt-1" />
          <div className="grid gap-1.5">
            <Label htmlFor={quizType.id} className="font-medium">
              {quizType.label}
            </Label>
            <p className="text-sm text-muted-foreground">
              {quizType.description}
            </p>
          </div>
        </div>
      ))}
    </RadioGroup>
  );
}
