import { configDotenv } from "dotenv";
import puppeteer from "puppeteer";
import Mailjet from "node-mailjet";
import cron from "node-cron";

configDotenv();

const mailjet = new Mailjet({
  apiKey: process.env.MJ_APIKEY_PUBLIC,
  apiSecret: process.env.MJ_APIKEY_PRIVATE,
});

const getJobListing = async () => {
  // Start a Puppeteer session with:
  // - a visible browser (`headless: false` - easier to debug because you'll see the browser in action)
  // - no default viewport (`defaultViewport: null` - website page will be in full width and height)
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });

  // Open a new page
  const page = await browser.newPage();
  await page.goto(
    "https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword=developer",
    {
      waitUntil: "domcontentloaded",
    }
  );

  // Get page data
  const jobPost = await page.evaluate(() => {
    const jobList = document.querySelectorAll(".latest-job-post");

    return Array.from(jobList).map((job) => {
      const jobTitle = job.querySelector("h4[data-original-title]").innerText;
      const jobType = job.querySelector("span.badge").innerText;
      const jobLink = job.querySelector("a").href;
      const jobSalary = job.querySelector("dd.col").innerText;
      const jobPostedMeta = job.querySelector("p[data-temp]").innerText;

      return { jobTitle, jobType, jobLink, jobSalary, jobPostedMeta };
    });
  });

  const emailRequest = mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: "jushuavalencia@gmail.com",
          Name: "Jushua Automated Email",
        },
        To: [
          {
            Email: "jushuavalencia@gmail.com",
            Name: "Jushua Valencia",
          },
        ],
        Subject: "OLJ Job Postings for Developers",
        TextPart:
          "These are the latest job postings for developers in OnlineJobs.ph.",
        HTMLPart: jobPost
          .map(
            (job) => `
                      <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;">
                          <h4>${job.jobTitle}</h4>
                          <h4>${job.jobPostedMeta}</h4>
                          <p>${job.jobType}</p>
                          <p>${job.jobSalary}</p>
                          <a href="${job.jobLink}">View Job</a>
                      </div>
                  `
          )
          .join(""),
      },
    ],
  });

  emailRequest
    .then((result) => {
      console.log(result.body);
    })
    .catch((err) => {
      console.log(err.statusCode);
    });

  // Close the browser
  await browser.close();
};

cron.schedule("0 * * * *", () => {
  getJobListing();
});

getJobListing();
// Start the scraping
