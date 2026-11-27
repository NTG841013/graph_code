"use client";

import { useEffect, useState } from "react";

export function Copyright() {
  const [year, setYear] = useState<number>(2024);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <>{year}</>;
}
