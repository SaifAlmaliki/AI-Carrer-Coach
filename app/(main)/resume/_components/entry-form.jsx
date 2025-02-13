/**
 * EntryForm Component
 *
 * A dynamic form component for managing resume entries (Experience, Education, Projects).
 * Features include:
 * - Add/Delete entries with title, organization, dates, and description
 * - AI-powered description improvement
 * - Form validation using Zod schema
 * - Support for current/ongoing entries
 * - Date formatting for better display
 */

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { entrySchema } from "@/app/lib/schema";
import { Sparkles, PlusCircle, X, Pencil, Save, Loader2 } from "lucide-react";
import { improveWithAI } from "@/actions/resume";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";

// Helper function to format dates for display (e.g., "Jan 2024")
const formatDisplayDate = (dateString) => {
  if (!dateString) return "";
  const date = parse(dateString, "yyyy-MM", new Date());
  return format(date, "MMM yyyy");
};

export function EntryForm({ type, entries, onChange }) {
  // State for managing form visibility
  const [isAdding, setIsAdding] = useState(false);

  // Initialize form with validation and default values
  const { register, handleSubmit: handleValidation, formState: { errors }, reset, watch, setValue } = useForm({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      title: "",
      organization: "",
      startDate: "",
      endDate: "",
      description: "",
      current: false,
    },
  });

  // Watch current checkbox for conditional rendering
  const current = watch("current");

  // Handle form submission for new entries
  const handleAdd = handleValidation((data) => {
    const formattedEntry = {
      ...data,
      startDate: formatDisplayDate(data.startDate),
      endDate: data.current ? "" : formatDisplayDate(data.endDate),
    };

    onChange([...entries, formattedEntry]);
    reset();
    setIsAdding(false);
  });

  // Handle entry deletion
  const handleDelete = (index) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(newEntries);
  };

  // AI improvement functionality
  const { loading: isImproving, fn: improveWithAIFn, data: improvedContent, error: improveError } = useFetch(improveWithAI);

  // Handle AI improvement results
  useEffect(() => {
    if (improvedContent && !isImproving) {
      setValue("description", improvedContent);
      toast.success("Description improved successfully!");
    }
    if (improveError) {
      toast.error(improveError.message || "Failed to improve description");
    }
  }, [improvedContent, improveError, isImproving, setValue]);

  // Handle AI improvement request
  const handleImproveDescription = async () => {
    const description = watch("description");
    if (!description) {
      toast.error("Please enter a description first");
      return;
    }

    await improveWithAIFn({
      current: description,
      type: type.toLowerCase(), // 'experience', 'education', or 'project'
    });
  };

  return (
    <div className="space-y-4">
      {/* Entry List: Displays all existing entries */}
      <div className="space-y-4">
        {entries.map((item, index) => (
          <Card key={index}>
            {/* Entry Header: Shows title, organization, and delete button */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title} @ {item.organization}
              </CardTitle>
              <Button variant="outline" size="icon" type="button" onClick={() => handleDelete(index)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            {/* Entry Content: Shows dates and description */}
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {item.current
                  ? `${item.startDate} - Present`
                  : `${item.startDate} - ${item.endDate}`}
              </p>
              <p className="mt-2 text-sm whitespace-pre-wrap">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Entry Form: Shows when isAdding is true */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Add {type}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Title and Organization inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input placeholder="Title/Position" {...register("title")} error={errors.title} />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Organization/Company"
                  {...register("organization")}
                  error={errors.organization}
                />
                {errors.organization && (
                  <p className="text-sm text-red-500">
                    {errors.organization.message}
                  </p>
                )}
              </div>
            </div>

            {/* Date inputs with current position toggle */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input type="month" {...register("startDate")} error={errors.startDate} />
                {errors.startDate && (
                  <p className="text-sm text-red-500">
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Input type="month" {...register("endDate")} disabled={current} error={errors.endDate}/>
                {errors.endDate && (
                  <p className="text-sm text-red-500">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Current position checkbox */}
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="current" {...register("current")} onChange={(e) => {
                  setValue("current", e.target.checked);
                  if (e.target.checked) {
                    setValue("endDate", "");
                  }
                }}
              />
              <label htmlFor="current">Current {type}</label>
            </div>

            {/* Description textarea with AI improvement button */}
            <div className="space-y-2">
              <Textarea placeholder={`Description of your ${type.toLowerCase()}`} className="h-32" {...register("description")} error={errors.description}/>
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleImproveDescription}
              disabled={isImproving || !watch("description")}
            >
              {isImproving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Improving...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Improve with AI
                </>
              )}
            </Button>
          </CardContent>

          {/* Form action buttons */}
          <CardFooter className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setIsAdding(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAdd}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Add Entry Button: Shows when form is not visible */}
      {!isAdding && (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => setIsAdding(true)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add {type}
        </Button>
      )}
    </div>
  );
}
