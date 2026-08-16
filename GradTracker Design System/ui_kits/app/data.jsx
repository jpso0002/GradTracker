const APPLICATIONS = [
  { id:"monzo", company:"Monzo", role:"Backend Engineering Intern", stage:"interview", nextAction:"Confirm Thursday 14:00 slot", deadline:"14 Sep", daysLeft:2, salary:"£38,000", location:"London · Hybrid", source:"Greenhouse", confidence:0.96, score:94,
    timeline:[["11 Aug","Applied via Monzo careers"],["27 Aug","Online assessment passed"],["09 Sep","Interview invitation received"]] },
  { id:"arup", company:"Arup", role:"Graduate Structural Engineer", stage:"assessment", nextAction:"Finish numerical test", deadline:"19 Sep", daysLeft:7, salary:"£31,500", location:"Manchester · On-site", source:"Workday", confidence:0.88, score:87,
    timeline:[["02 Sep","Applied via Workday"],["08 Sep","Numerical test link sent"]] },
  { id:"deloitte", company:"Deloitte", role:"Audit Graduate Scheme", stage:"applied", nextAction:"Wait for screening", deadline:null, daysLeft:null, salary:"£33,000", location:"Birmingham · Hybrid", source:"Gmail", confidence:0.74, score:71,
    timeline:[["29 Aug","Application submitted"]] },
  { id:"revolut", company:"Revolut", role:"Product Analyst Intern", stage:"offer", nextAction:"Reply by 22 Sep", deadline:"22 Sep", daysLeft:10, salary:"£42,000", location:"London · On-site", source:"Greenhouse", confidence:0.98, score:99,
    timeline:[["14 Jul","Applied"],["03 Aug","Two interviews completed"],["11 Sep","Offer received"]] },
  { id:"nhs", company:"NHS Digital", role:"Data Science Placement", stage:"assessment", nextAction:"Book assessment centre", deadline:"16 Sep", daysLeft:4, salary:"£29,800", location:"Leeds · Hybrid", source:"Gmail", confidence:0.81, score:78,
    timeline:[["21 Aug","Applied"],["05 Sep","Invited to assessment centre"]] },
  { id:"ocado", company:"Ocado Technology", role:"Software Engineer Grad", stage:"rejected", nextAction:"Ask for feedback", deadline:null, daysLeft:null, salary:"£40,000", location:"Hatfield · Hybrid", source:"Lever", confidence:0.91, score:32,
    timeline:[["04 Aug","Applied"],["30 Aug","Rejected after tech screen"]] },
  { id:"pwc", company:"PwC", role:"Technology Consulting Grad", stage:"withdrawn", nextAction:"—", deadline:null, daysLeft:null, salary:"£35,000", location:"London · Hybrid", source:"Gmail", confidence:0.69, score:12,
    timeline:[["19 Jul","Applied"],["25 Aug","Withdrawn — accepted other process"]] },
  { id:"bloomberg", company:"Bloomberg", role:"Engineering Summer Intern", stage:"applied", nextAction:"Wait for screening", deadline:"30 Sep", daysLeft:18, salary:"£45,000", location:"London · On-site", source:"Gmail", confidence:0.86, score:64,
    timeline:[["09 Sep","Applied via referral"]] },
];

const REVIEW_QUEUE = [
  { id:"r1", subject:"Your application to Stripe — next steps", from:"no-reply@greenhouse.io", received:"12 minutes ago", confidence:0.93,
    fields:[["Company","Stripe",0.97],["Role","Payments Engineering Intern",0.9],["Stage","Assessment pending",0.86],["Deadline","21 Sep, 23:59",0.79]] },
  { id:"r2", subject:"Interview confirmation — Wednesday", from:"talent@wise.com", received:"1 hour ago", confidence:0.71,
    fields:[["Company","Wise",0.95],["Role","Graduate Data Analyst",0.68],["Stage","Interview scheduled",0.88],["Deadline","18 Sep, 10:30",0.52]] },
  { id:"r3", subject:"Thanks for applying to Octopus Energy", from:"careers@octopus.energy", received:"3 hours ago", confidence:0.64,
    fields:[["Company","Octopus Energy",0.94],["Role","Grad Software Engineer",0.6],["Stage","Applied",0.83],["Deadline","—",0.2]] },
];

Object.assign(window, { APPLICATIONS, REVIEW_QUEUE });
