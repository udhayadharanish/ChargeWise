import cron from "node-cron"

cron.schedule('25 12 * * *', () => {
    console.log('running a task every minute');
  });