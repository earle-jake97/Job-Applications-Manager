import express from "express";
import { pool } from "./db.js";

const app = express();
app.use(express.json());
const port = 3001;

const exampleApplications = [
  {
    id: 1,
    company: "Example Corp",
    position: "Software Engineer",
    status: "Applied",
  },
  {
    id: 2,
    company: "Another Corp",
    position: "Product Manager",
    status: "Interview",
  },
];

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/applications", (_request, response) => {
  response.json(exampleApplications);
});

app.post("/api/applications", (request, response) => {
  const { company, position } = request.body ?? {};

  if (
    typeof company !== "string" ||
    typeof position !== "string" ||
    !company.trim() ||
    !position.trim()
  ) {
    response.status(400).json({
      message: "Company and position must be non-empty strings",
    });
    return;
  }

  const application = {
    id: Math.max(0, ...exampleApplications.map((job) => job.id)) + 1,
    company: company.trim(),
    position: position.trim(),
    status: "Applied",
  };

  exampleApplications.push(application);

  response.status(201).json(application);
});

app.delete("/api/applications/:id", (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    response.status(400).json({ message: "Invalid application ID" });
    return;
  }

  const index = exampleApplications.findIndex((job) => job.id === id);

  if (index === -1) {
    response.status(404).json({ message: "Application not found" });
    return;
  }

  exampleApplications.splice(index, 1);
  response.status(204).send();
});

app.patch("/api/applications/:id", (request, response) => {
  const id = Number(request.params.id);
  const { status } = request.body ?? {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    response.status(400).json({ message: "Invalid application ID" });
    return;
  }

  const allowedStatuses = ["Applied", "Interview", "Rejected", "Offer"];

  if (typeof status !== "string" || !allowedStatuses.includes(status)) {
    response.status(400).json({ message: "Invalid application status" });
    return;
  }

  const application = exampleApplications.find((job) => job.id === id);

  if (!application) {
    response.status(404).json({ message: "Application not found" });
    return;
  }

  application.status = status;
  response.json(application);
});

app.get("/api/database-applications", async (_request, response) => {
  try {
    const result = await pool.query(
      "SELECT id, company, position, status FROM applications ORDER BY id",
    );

    response.json(result.rows);
  } catch (error) {
    console.error("Could not read applications:", error);
    response.status(500).json({
      message: "Could not load applications",
    });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`API listening at http://127.0.0.1:${port}`);
});
