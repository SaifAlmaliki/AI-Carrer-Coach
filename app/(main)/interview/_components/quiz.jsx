/**
 * Quiz Component
 *
 * A dynamic quiz interface that presents AI-generated technical interview questions.
 * This component handles the complete quiz flow including:
 * - Quiz generation based on user's industry and skills
 * - Question presentation and answer collection
 * - Real-time feedback with explanations
 * - Score calculation and result saving
 * - Progress tracking and navigation
 *
 * The component uses custom hooks for data fetching and maintains local state
 * for quiz progression and user interactions.
 */

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import QuizResult from "./quiz-result";
import useFetch from "@/hooks/use-fetch";
import { BarLoader } from "react-spinners";
import QuizTypeSelector from "./quiz-type-selector";

// Import server actions
import { generateQuiz as generateQuizAction, saveQuizResult as saveQuizResultAction } from "@/actions/interview";

export default function Quiz() {
  // State management for quiz progression and user interactions
  const [currentQuestion, setCurrentQuestion] = useState(0);      // Tracks current question index
  const [answers, setAnswers] = useState([]);                     // Stores user's answers
  const [showExplanation, setShowExplanation] = useState(false);  // Controls explanation visibility
  const [selectedType, setSelectedType] = useState("technical");  // Stores selected quiz type
  const [quizStarted, setQuizStarted] = useState(false);          // Tracks whether the quiz has started

  // Custom hooks for handling async operations with server actions
  const { loading: generatingQuiz, fn: generateQuizFn, data: quizData } = useFetch(
    () => generateQuizAction([selectedType])
  );
  const { loading: savingResult, fn: saveQuizResultFn, data: resultData, setData: setResultData } = useFetch(
    (questions, answers, score) => saveQuizResultAction(questions, answers, score)
  );

  // Initialize answers array when quiz data is loaded
  useEffect(() => {
    if (quizData) {
      setAnswers(new Array(quizData.length).fill(null));
    }
  }, [quizData]);

  const handleTypeChange = (type) => {
    setSelectedType(type);
  };

  const startQuiz = async () => {
    try {
      await generateQuizFn();
      setQuizStarted(true);
    } catch (error) {
      toast.error("Failed to generate quiz questions");
    }
  };

  // Handler for when user selects an answer
  const handleAnswer = (answer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);
  };

  // Handler for navigating to next question or finishing quiz
  const handleNext = () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  // Calculate the final score as a percentage
  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === quizData[index].correctAnswer) {
        correct++;
      }
    });
    return (correct / quizData.length) * 100;
  };

  // Save quiz results and handle completion
  const finishQuiz = async () => {
    const score = calculateScore();
    try {
      await saveQuizResultFn(quizData, answers, score);
      toast.success("Quiz completed!");
    } catch (error) {
      toast.error(error.message || "Failed to save quiz results");
    }
  };

  // Reset quiz state and generate new questions
  const startNewQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setShowExplanation(false);
    generateQuizFn();
    setResultData(null);
  };

  // Loading state while generating quiz
  if (generatingQuiz) {
    return <BarLoader className="mt-4" width={"100%"} color="gray" />;
  }

  // Show results screen after quiz completion
  if (resultData) {
    return (
      <div className="mx-2">
        <QuizResult result={resultData} onStartNew={startNewQuiz} />
      </div>
    );
  }

  // Initial quiz start screen
  if (!quizStarted) {
    return (
      <Card className="mx-2">
        <CardHeader>
          <CardTitle>Ready to test your knowledge?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This quiz contains 10 questions specific to your industry and
            skills. Take your time and choose the best answer for each question.
          </p>
          <QuizTypeSelector
            type={selectedType}
            onTypeChange={handleTypeChange}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={startQuiz} className="w-full">
            Start Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Main quiz interface
  const question = quizData[currentQuestion];
  return (
    <Card className="mx-2">
      <CardHeader>
        <CardTitle>
          Question {currentQuestion + 1} of {quizData.length}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Question text and answer options */}
        <p className="text-lg font-medium">{question.question}</p>
        <RadioGroup
          onValueChange={handleAnswer}
          value={answers[currentQuestion]}
          className="space-y-2"
        >
          {question.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`}>{option}</Label>
            </div>
          ))}
        </RadioGroup>

        {/* Explanation section shown after answering */}
        {showExplanation && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-medium">Explanation:</p>
            <p className="text-muted-foreground">{question.explanation}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {/* Show explanation button */}
        {!showExplanation && (
          <Button
            onClick={() => setShowExplanation(true)}
            variant="outline"
            disabled={!answers[currentQuestion]}
          >
            Show Explanation
          </Button>
        )}
        {/* Next/Finish button */}
        <Button onClick={handleNext} disabled={!answers[currentQuestion] || savingResult} className="ml-auto">
          {savingResult && (
            <BarLoader className="mt-4" width={"100%"} color="gray" />
          )}
          {currentQuestion < quizData.length - 1
            ? "Next Question"
            : "Finish Quiz"}
        </Button>
      </CardFooter>
    </Card>
  );
}
