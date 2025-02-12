import { useState } from "react";
import { toast } from "sonner";

/**
 A custom hook for handling asynchronous data fetching.
 * It provides state management for data, loading, and error.
 */
const useFetch = (cb) => {
  // State variables to manage data, loading, and error
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  // Async function to handle the data fetching
  const fn = async (...args) => {
    setLoading(true);
    setError(null);

    try {
      // Execute the callback function
      const response = await cb(...args);
      setData(response);
      setError(null);
    } catch (error) {
      // Handle errors and display a toast notification
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Return the state variables and the fetch function
  return { data, loading, error, fn, setData };
};

export default useFetch;
