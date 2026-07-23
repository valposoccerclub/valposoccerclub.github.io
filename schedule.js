const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQI65YvxYrKtpPyN4sdE57Von7-NAvi3pEodW0H6xg7NZCCmqGKKE31e1yrqy7LoxaPO9s7TBVc9v5p/pub?output=csv";


/*
  Controls the order in which division groups appear.
*/
const DIVISION_ORDER = ["U8", "U10", "U12", "U14"];

/*
  Load the published Google Sheet.
*/
async function loadSchedule() {
  const loadingMessage = document.getElementById("schedule-loading");
  const table = document.getElementById("schedule-table");

  try {
    const response = await fetch(SHEET_CSV_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Unable to load schedule. Server returned ${response.status}.`
      );
    }

    const csvText = await response.text();

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader(header) {
        return String(header).trim();
      }
    });

    if (parsed.errors.length > 0) {
      console.warn("CSV parsing warnings:", parsed.errors);
    }

    const columnNames = parsed.meta.fields ?? [];

    /*
      Remove completely empty rows.
    */
    const scheduleRows = parsed.data.filter(row =>
      columnNames.some(columnName => {
        return String(row[columnName] ?? "").trim() !== "";
      })
    );

    if (columnNames.length === 0) {
      throw new Error("No spreadsheet headings were found.");
    }

    if (scheduleRows.length === 0) {
      throw new Error("No schedule rows were found.");
    }

    /*
      Confirm that a Division column exists.
    */
    const divisionColumn = findDivisionColumn(columnNames);

    if (!divisionColumn) {
      console.log("Available spreadsheet headings:", columnNames);

      throw new Error(
        'A column named "Division" could not be found in the published sheet.'
      );
    }

    renderSchedule(columnNames, scheduleRows, divisionColumn);

    loadingMessage.hidden = true;
    table.hidden = false;
  } catch (error) {
    console.error("Practice schedule error:", error);

    loadingMessage.classList.add("error");
    loadingMessage.textContent =
      error instanceof Error
        ? error.message
        : "The practice schedule could not be loaded.";
  }
}

/*
  Finds the Division heading without requiring exact capitalization.

  It accepts:
  Division
  division
  Age Division
*/
function findDivisionColumn(columnNames) {
  return columnNames.find(columnName => {
    const normalizedHeading = String(columnName)
      .trim()
      .toLowerCase();

    return (
      normalizedHeading === "division" ||
      normalizedHeading === "age division"
    );
  });
}

/*
  Converts the sheet's division value into one of our supported groups.

  Examples:
  U8          -> U8
  U08         -> U8
  U8 Boys     -> U8
  U8 Girls    -> U8
  U10B        -> U10
  U10 Girls   -> U10
*/
function getDivisionGroup(value) {
  const normalizedValue = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

  /*
    Check longer division names first so U10 does not accidentally
    get interpreted as U1 or another partial value.
  */
  if (/^U14\b/.test(normalizedValue) || /^U14/.test(normalizedValue)) {
    return "U14";
  }

  if (/^U12\b/.test(normalizedValue) || /^U12/.test(normalizedValue)) {
    return "U12";
  }

  if (/^U10\b/.test(normalizedValue) || /^U10/.test(normalizedValue)) {
    return "U10";
  }

  if (
    /^U8\b/.test(normalizedValue) ||
    /^U8/.test(normalizedValue) ||
    /^U08\b/.test(normalizedValue) ||
    /^U08/.test(normalizedValue)
  ) {
    return "U8";
  }

  return null;
}

/*
  Converts U10 into division-u10.
*/
function getDivisionClass(division) {
  return `division-${division.toLowerCase()}`;
}

/*
  Builds the complete table.
*/
function renderSchedule(columnNames, scheduleRows, divisionColumn) {
  const tableHead = document.querySelector("#schedule-table thead");
  const tableBody = document.querySelector("#schedule-table tbody");

  tableHead.replaceChildren();
  tableBody.replaceChildren();

  renderTableHeader(tableHead, columnNames);

  const groupedRows = groupRowsByDivision(
    scheduleRows,
    divisionColumn
  );

  DIVISION_ORDER.forEach(division => {
    const rows = groupedRows[division];

    if (!rows || rows.length === 0) {
      return;
    }

    renderDivisionHeading(
      tableBody,
      division,
      columnNames.length
    );

    rows.forEach((row, rowIndex) => {
      const isFirstRow = rowIndex === 0;
      const isLastRow = rowIndex === rows.length - 1;

      renderScheduleRow({
        tableBody,
        row,
        columnNames,
        division,
        divisionColumn,
        isFirstRow,
        isLastRow
      });
    });
  });
}

/*
  Builds the green table header.
*/
function renderTableHeader(tableHead, columnNames) {
  const headerRow = document.createElement("tr");

  columnNames.forEach(columnName => {
    const heading = document.createElement("th");

    heading.scope = "col";
    heading.textContent = columnName;

    headerRow.appendChild(heading);
  });

  tableHead.appendChild(headerRow);
}

/*
  Groups rows without changing the rows themselves.
*/
function groupRowsByDivision(scheduleRows, divisionColumn) {
  const groups = {
    U8: [],
    U10: [],
    U12: [],
    U14: []
  };

  scheduleRows.forEach(row => {
    const division = getDivisionGroup(row[divisionColumn]);

    if (!division) {
      console.warn(
        "Skipping unrecognized division:",
        row[divisionColumn],
        row
      );

      return;
    }

    groups[division].push(row);
  });

  return groups;
}

/*
  Creates a heading such as "U10 Practices".
*/
function renderDivisionHeading(
  tableBody,
  division,
  columnCount
) {
  const headingRow = document.createElement("tr");
  const headingCell = document.createElement("th");
  const headingLabel = document.createElement("span");

  headingRow.className =
    `division-heading ${getDivisionClass(division)}`;

  headingCell.colSpan = columnCount;

  headingLabel.className = "division-heading-label";
  headingLabel.textContent = `${division} Practices`;

  headingCell.appendChild(headingLabel);
  headingRow.appendChild(headingCell);
  tableBody.appendChild(headingRow);
}

/*
  Creates one schedule row.
*/
function renderScheduleRow({
  tableBody,
  row,
  columnNames,
  division,
  divisionColumn,
  isFirstRow,
  isLastRow
}) {
  const tableRow = document.createElement("tr");

  tableRow.classList.add(
    "schedule-row",
    getDivisionClass(division)
  );

  if (isFirstRow) {
    tableRow.classList.add("group-first-row");
  }

  if (isLastRow) {
    tableRow.classList.add("group-last-row");
  }

  columnNames.forEach(columnName => {
    const isDivisionColumn = columnName === divisionColumn;

    const cell = document.createElement(
      isDivisionColumn ? "th" : "td"
    );

    const value = String(row[columnName] ?? "").trim();

if (isDivisionColumn) {
  cell.scope = "row";
  cell.className = "division-label";
  cell.textContent = value || division;
} else if (value.toUpperCase() === "[OPEN]") {
  const openSpot = document.createElement("span");

  openSpot.className = "open-practice-slot";
  openSpot.setAttribute("aria-label", "Open practice spot");
  openSpot.title = "Open practice spot";

  cell.appendChild(openSpot);
} else if (value) {
  const team = document.createElement("span");

  team.className = "team-name";
  team.textContent = value;

  cell.appendChild(team);
} else {
  cell.className = "empty-slot";
  cell.setAttribute("aria-label", "No practice scheduled");
}

    tableRow.appendChild(cell);
  });

  tableBody.appendChild(tableRow);
}

/*
  Start loading after the HTML is ready.
*/
document.addEventListener("DOMContentLoaded", loadSchedule);
