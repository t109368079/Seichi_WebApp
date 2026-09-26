import { describe, expect, it } from "vitest";
import { googleSheetCellsToValues } from "@/infrastructure/google/google-sheets";

describe("google sheets cell conversion", () => {
  it("uses hidden Drive and Maps hyperlinks for import-specific columns", () => {
    const values = googleSheetCellsToValues([
      [
        { formattedValue: "scene_code" },
        { formattedValue: "anime_drive_file_id" },
        { formattedValue: "maps_url" },
        { formattedValue: "notes" },
      ],
      [
        { formattedValue: "RLS-001" },
        {
          formattedValue: "RLS_Test (1).png",
          hyperlink:
            "https://drive.google.com/open?id=1q9BJphWOn1J-jAV8eJyBdLIOwXMIUdsB&usp=drive_copy",
        },
        {
          formattedValue: "Tokyo Station",
          textFormatRuns: [
            {
              format: {
                link: {
                  uri: "https://www.google.com/maps/place/Tokyo+Station",
                },
              },
            },
          ],
        },
        {
          formattedValue: "Displayed note",
          hyperlink: "https://drive.google.com/open?id=note-link",
        },
      ],
    ]);

    expect(values).toEqual([
      ["scene_code", "anime_drive_file_id", "maps_url", "notes"],
      [
        "RLS-001",
        "https://drive.google.com/open?id=1q9BJphWOn1J-jAV8eJyBdLIOwXMIUdsB&usp=drive_copy",
        "https://www.google.com/maps/place/Tokyo+Station",
        "Displayed note",
      ],
    ]);
  });

  it("uses Drive smart chip URIs for anime image cells", () => {
    const values = googleSheetCellsToValues([
      [{ formattedValue: "anime_drive_file_id" }],
      [
        {
          formattedValue: "RLS_Test (1).png",
          chipRuns: [
            {
              chip: {
                richLinkProperties: {
                  uri: "https://drive.google.com/file/d/mock-chip-file/view",
                },
              },
            },
          ],
        },
      ],
    ]);

    expect(values).toEqual([
      ["anime_drive_file_id"],
      ["https://drive.google.com/file/d/mock-chip-file/view"],
    ]);
  });

  it("falls back to displayed values and ignores completely empty grid rows", () => {
    const values = googleSheetCellsToValues([
      [{ formattedValue: "scene_code" }, { formattedValue: "notes" }],
      [{ formattedValue: "RLS-001" }, { formattedValue: "No link" }],
      [{}, {}],
      [{}, {}],
    ]);

    expect(values).toEqual([
      ["scene_code", "notes"],
      ["RLS-001", "No link"],
    ]);
  });
});
