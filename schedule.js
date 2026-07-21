const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQI65YvxYrKtpPyN4sdE57Von7-NAvi3pEodW0H6xg7NZCCmqGKKE31e1yrqy7LoxaPO9s7TBVc9v5p/pub?output=csv";

async function loadSchedule() {
  const loadingMessage = document.getElementById("schedule-loading");
  const table = document.getElementById("schedule-table");
  const tableHead = table.querySelector("thead");
  const tableBody = table.querySelector("tbody");

  try {
    const response = await fetch(SHEET_CSV_URL);

    if (!response.ok) {
      throw new Error(`Unable to load schedule: ${response.status}`);
    }

    const csvText = await response.text();

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim()
    });

    if (parsed.errors.length > 0) {
      console.warn("CSV parsing warnings:", parsed.errors);
    }

    const scheduleRows = parsed.data;
    const columnNames = parsed.meta.fields ?? [];

    if (!scheduleRows.length || !columnNames.length) {
      throw new Error("The published schedule does not contain any data.");
    }

    renderSchedule(columnNames, scheduleRows);

    loadingMessage.hidden = true;
    table.hidden = false;
  } catch (error) {
    console.error(error);
    loadingMessage.textContent =
      "The practice schedule could not be loaded. Please try again later.";
  }
}

function renderSchedule(columnNames, scheduleRows) {
  const tableHead = document.querySelector("#schedule-table thead");
  const tableBody = document.querySelector("#schedule-table tbody");

  tableHead.replaceChildren();
  tableBody.replaceChildren();

  const headerRow = document.createElement("tr");

  columnNames.forEach(columnName => {
    const heading = document.createElement("th");
    heading.scope = "col";
    heading.textContent = columnName;
    headerRow.appendChild(heading);
  });

  tableHead.appendChild(headerRow);

  scheduleRows.forEach(row => {
  const tableRow = document.createElement("tr");

  const division = String(row["Division"] ?? "")
    .trim()
    .toUpperCase();

  let divisionClass = "";

  if (division.startsWith("U6") || division.startsWith("U06")) {
    divisionClass = "u6";
  } else if (division.startsWith("U8") || division.startsWith("U08")) {
    divisionClass = "u8";
  } else if (division.startsWith("U10")) {
    divisionClass = "u10";
  } else if (division.startsWith("U12")) {
    divisionClass = "u12";
  } else if (division.startsWith("U14")) {
    divisionClass = "u14";
  } else if (division.startsWith("U19")) {
    divisionClass = "u19";
  }

  console.log({
    division,
    divisionClass
  });

  columnNames.forEach((columnName, index) => {
    const cell = document.createElement(index === 0 ? "th" : "td");

    if (index === 0) {
      cell.scope = "row";
    }

    const value = String(row[columnName] ?? "").trim();

    if (value) {
      const team = document.createElement("span");
      team.className = `team-name ${divisionClass}`;
      team.textContent = value;
      cell.appendChild(team);
    } else {
      cell.className = "empty-slot";
      cell.setAttribute("aria-label", "No practice scheduled");
    }

    tableRow.appendChild(cell);
  });

  tableBody.appendChild(tableRow);
});
}

loadSchedule();