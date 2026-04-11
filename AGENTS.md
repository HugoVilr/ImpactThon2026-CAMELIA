REPOSITORY INFORMATION: PROJECT DIRECTIONS AND VISION

We are going to develop the project described in the files in /instructions for a hackathon in one day. Have this information in mind when developing the project, but don't stick to it religiously; we are not going to follow everything as it is there.

Our vision: a web page with a dashboard with an input field and a list of jobs (api calls) that can be either running or completed. This list works as a history. When clicking a completed entry, it will switch to that job's page, where the molecule can be visualized with both a classic embed and an optional babylon.js AR/VR session where the protein can be visualized and manipulated in 3D. In the future more information about that protein can be obtained and showed there too, for example with integrations with pdbs or an AI chatbot.

We have a framework in react with ts frontend and python/fastapi backend. We have a database in a docker container which currently has no purpose. All the history entries and logs are currently provided by the mock API.

IMPORTANT: carefully read the provided API and have it in mind before designing anything, as is important to use it when possible. Find the API in the instructions or here: https://api-mock-cesga.onrender.com/docs#/