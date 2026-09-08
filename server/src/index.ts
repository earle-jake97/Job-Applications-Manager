import express from "express";
import { parseApplicationInput } from "./validation.js";
import {
  createApplication,
  deleteApplication,
  listApplications,
  updateApplicationStatus,
  updateApplicationDetails,
} from "./applications.js";

const app = express();
app.use(express.json());
const port = 3001;

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/applications", async (_request, response) => {
  try {
    response.json(await listApplications());
  } catch (error) {
    console.error("Could not read applications:", error);
    response.status(500).json({ message: "Could not load applications" });
  }
});

app.post("/api/applications", async (request, response) => {
  const parsed = parseApplicationInput(request.body);
  if (!parsed.data) {
    response.status(400).json({ message: parsed.error });
    return;
  }

  try {
    const { company, position } = parsed.data;
    const application = await createApplication(company, position, parsed.data);
    response.status(201).json(application);
  } catch (error) {
    console.error("Could not create application:", error);
    response.status(500).json({ message: "Could not create application" });
  }
});

app.delete("/api/applications/:id", async (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    response.status(400).json({ message: "Invalid application ID" });
    return;
  }

  try {
    const deleted = await deleteApplication(id);
    if (!deleted) {
      response.status(404).json({ message: "Application not found" });
      return;
    }
    response.status(204).send();
  } catch (error) {
    console.error("Could not delete application:", error);
    response.status(500).json({ message: "Could not delete application" });
  }
});

app.patch("/api/applications/:id", async (request, response) => {
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

  try {
    const application = await updateApplicationStatus(id, status);
    if (!application) {
      response.status(404).json({ message: "Application not found" });
      return;
    }
    response.json(application);
  } catch (error) {
    console.error("Could not update application:", error);
    response.status(500).json({ message: "Could not update application" });
  }
});

// The details form sends all editable fields; status uses the existing PATCH route.
app.patch('/api/applications/:id/details', async (request, response) => {
  const id = Number(request.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    response.status(400).json({ message: 'Invalid application ID' });
    return;
  }
  const parsed = parseApplicationInput(request.body);
  if (!parsed.data) {
    response.status(400).json({ message: parsed.error });
    return;
  }
  try {
    const application = await updateApplicationDetails(id, parsed.data);
    if (!application) {
      response.status(404).json({ message: 'Application not found' });
      return;
    }
    response.json(application);
  } catch (error) {
    console.error('Could not edit application:', error);
    response.status(500).json({ message: 'Could not save application details' });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`API listening at http://127.0.0.1:${port}`);
});
