import { TestPluginMethod } from "@grouparoo/core";
import Spreadsheet from "./sheet-import/spreadsheet";

const TEST_SHEET_ID =
  "https://docs.google.com/spreadsheets/d/11zccS101c27B9mYLMJiaAPfDgoj2chOq39n3MZrcKTk/edit#gid=0"; // can be anything. not used for test

export const test: TestPluginMethod = async ({ appOptions }) => {
  const sheet = new Spreadsheet(appOptions, TEST_SHEET_ID);
  await sheet.connect();
  return true;
};
