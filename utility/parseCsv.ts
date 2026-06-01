import fs from "fs";
import { parse } from "fast-csv";

export const parseAndReturnJSON = async (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];

    fs.createReadStream(filePath, { encoding: "utf-8" }) // 🚀 Ensure UTF-8 encoding
      .pipe(
        parse({
          headers: true,
          ignoreEmpty: true, // Removes empty rows
          trim: true, // Trims spaces within cells
        })
      )
      .on("data", (row) => {
        // Extra trimming & validation
        Object.keys(row).forEach((key) => {
          if (typeof row[key] === "string") {
            row[key] = row[key].trim();
          }
        });

        results.push(row);
      })
      .on("end", () => {
        if (results.length === 0) {
          return reject(new Error("Parsed CSV is empty!")); // 🚨 Prevent invalid JSON
        }
        resolve(results);
      })
      .on("error", (error) => reject(error));
  });
};
