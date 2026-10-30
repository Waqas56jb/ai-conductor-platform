import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { buildFec, FEC_COLUMNS, fecFileName, letterCode } from "./fec";
import { paidOf, parisDay, settle } from "./ledger";
import { monthlyRevenue, quoteConversion, receivablesAgeing } from "./reports";

describe("ledger", () => {
  it("only counts verified payments", () => {
    expect(
      paidOf([
        { amount: 100.1, status: "verified" },
        { amount: 50, status: "pending" },
        { amount: 20.2, status: "verified" },
      ]),
    ).toBe(120.3);
  });

  it("settles partial and full payments, never more than what remains", () => {
    expect(settle(360, 0, 160)).toEqual({ ok: true, remaining: 200, fullyPaid: false });
    expect(settle(360, 160, 200)).toEqual({ ok: true, remaining: 0, fullyPaid: true });
    expect(settle(360, 160, 200.01)).toEqual({ ok: false, remaining: 200 });
    expect(settle(360, 0, 0).ok).toBe(false);
  });

  it("dates entries in French local time", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Paris.
    expect(parisDay("2026-12-31T23:30:00Z")).toBe("2027-01-01");
    expect(parisDay("2026-06-30T21:59:00Z")).toBe("2026-06-30");
  });
});

describe("reports", () => {
  const invoices = [
    {
      id: "a",
      amount: 1200,
      issued_at: "2026-01-10T10:00:00Z",
      due_at: "2026-02-09T10:00:00Z",
      status: "paid",
    },
    {
      id: "b",
      amount: 600,
      issued_at: "2026-03-05T10:00:00Z",
      due_at: "2026-04-04T10:00:00Z",
      status: "unpaid",
    },
    {
      id: "c",
      amount: 300,
      issued_at: "2026-03-20T10:00:00Z",
      due_at: "2026-06-30T10:00:00Z",
      status: "unpaid",
    },
    { id: "d", amount: 999, issued_at: "2026-03-21T10:00:00Z", due_at: null, status: "cancelled" },
    {
      id: "e",
      amount: 80,
      issued_at: "2025-12-01T10:00:00Z",
      due_at: "2025-12-31T10:00:00Z",
      status: "unpaid",
    },
  ];
  const payments = [
    { invoice_id: "a", amount: 1200, paid_at: "2026-02-01T10:00:00Z", status: "verified" },
    { invoice_id: "b", amount: 100, paid_at: "2026-03-30T10:00:00Z", status: "verified" },
    { invoice_id: "b", amount: 50, paid_at: "2026-03-31T10:00:00Z", status: "rejected" },
  ];

  it("sums invoiced and collected per month of the year", () => {
    const months = monthlyRevenue(2026, invoices, payments);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ month: 0, invoiced: 1200, collected: 0 });
    expect(months[1]).toEqual({ month: 1, invoiced: 0, collected: 1200 });
    expect(months[2]).toEqual({ month: 2, invoiced: 900, collected: 100 });
  });

  it("ages what is still owed", () => {
    const now = new Date("2026-05-20T10:00:00Z");
    const byBucket = Object.fromEntries(
      receivablesAgeing(invoices, payments, now).map((b) => [b.bucket, b]),
    );
    expect(byBucket.notDue).toEqual({ bucket: "notDue", amount: 300, count: 1 });
    expect(byBucket.d60).toEqual({ bucket: "d60", amount: 500, count: 1 }); // 46 days late
    expect(byBucket.d90plus).toEqual({ bucket: "d90plus", amount: 80, count: 1 });
    expect(byBucket.d30.count + byBucket.d90.count).toBe(0);
  });

  it("measures the quote conversion on what the client saw", () => {
    const q = (status: string, sent: string | null, declined: string | null = null) => ({
      status,
      sent_at: sent,
      client_declined_at: declined,
    });
    const c = quoteConversion(2026, [
      q("accepted", "2026-02-01T10:00:00Z"),
      q("accepted", "2026-02-11T10:00:00Z"),
      q("accepted", "2026-03-01T10:00:00Z"),
      q("rejected", "2026-03-02T10:00:00Z", "2026-03-04T10:00:00Z"),
      q("sent_to_client", "2026-03-10T10:00:00Z"),
      // Refused by the office: never reached the client.
      q("rejected", null),
      q("accepted", "2025-06-01T10:00:00Z"),
    ]);
    expect(c).toMatchObject({ sent: 5, accepted: 3, declined: 1, pending: 1, rate: 75 });
    expect(c.months[2]).toEqual({ month: 2, accepted: 1, declined: 1, pending: 1 });
    expect(quoteConversion(2026, []).rate).toBeNull();
  });
});

describe("FEC", () => {
  const invoices = [
    {
      id: "inv1",
      reference: "FAC-2026-0001",
      issuedAt: "2026-03-05T10:00:00Z",
      title: "Fuite\tsalle de bains",
      clientId: "0f8fad5b-d9cb-469f-a165-70867728950e",
      clientName: "Camille Martin",
      total: 360,
      tax: 60,
    },
    {
      id: "inv2",
      reference: "FAC-2026-0002",
      issuedAt: "2026-03-08T10:00:00Z",
      title: "Serrure",
      clientId: null,
      clientName: "",
      total: 110,
      tax: 10,
    },
  ];
  const of1 = {
    invoiceId: "inv1",
    invoiceReference: "FAC-2026-0001",
    clientId: invoices[0].clientId,
    clientName: "Camille Martin",
  };
  const of2 = {
    invoiceId: "inv2",
    invoiceReference: "FAC-2026-0002",
    clientId: null,
    clientName: "",
  };
  const payments = [
    { ...of1, paidAt: "2026-03-20T10:00:00Z", amount: 160, reference: "VIR 123" },
    { ...of1, paidAt: "2026-04-02T10:00:00Z", amount: 200, reference: null },
    { ...of2, paidAt: "2026-04-03T10:00:00Z", amount: 50, reference: null },
    // Settles an invoice of last year: in the bank journal, never lettered here.
    {
      invoiceId: "old",
      invoiceReference: "FAC-2025-0042",
      clientId: null,
      clientName: "Syndic Horizon",
      paidAt: "2026-01-05T10:00:00Z",
      amount: 75,
      reference: null,
    },
  ];
  const fec = buildFec(invoices, payments);
  const rows = fec
    .slice(0, -2)
    .split("\r\n")
    .map((l) => l.split("\t"));
  const col = (row: string[], name: (typeof FEC_COLUMNS)[number]) => row[FEC_COLUMNS.indexOf(name)];
  const toNumber = (s: string) => Number(s.replace(",", "."));

  it("has the 18 legal columns on every line", () => {
    expect(rows[0]).toEqual([...FEC_COLUMNS]);
    for (const r of rows) expect(r).toHaveLength(18);
    expect(rows).toHaveLength(1 + 3 + 3 + 4 * 2);
  });

  it("balances every entry", () => {
    const entries = new Map<string, number>();
    for (const r of rows.slice(1))
      entries.set(
        col(r, "EcritureNum"),
        (entries.get(col(r, "EcritureNum")) ?? 0) +
          toNumber(col(r, "Debit")) -
          toNumber(col(r, "Credit")),
      );
    for (const total of entries.values()) expect(Math.abs(total)).toBeLessThan(0.001);
  });

  it("splits sales, VAT and client, in French formats", () => {
    const sale = rows.filter((r) => col(r, "EcritureNum") === "VE000001");
    expect(sale.map((r) => [col(r, "CompteNum"), col(r, "Debit"), col(r, "Credit")])).toEqual([
      ["411000", "360,00", "0,00"],
      ["706000", "0,00", "300,00"],
      ["445710", "0,00", "60,00"],
    ]);
    expect(col(sale[0], "EcritureDate")).toBe("20260305");
    expect(col(sale[0], "CompAuxNum")).toBe("C0F8FAD5B");
    expect(col(sale[0], "EcritureLib")).toBe("Facture FAC-2026-0001 Fuite salle de bains");
  });

  it("letters a fully paid invoice with its payments, not a partly paid one", () => {
    const client = rows.filter((r) => col(r, "CompteNum") === "411000");
    const lettered = client.filter((r) => col(r, "EcritureLet") === "AAA");
    expect(lettered.map((r) => col(r, "PieceRef"))).toEqual([
      "FAC-2026-0001",
      "VIR 123",
      "FAC-2026-0001",
    ]);
    expect(lettered.every((r) => col(r, "DateLet") === "20260402")).toBe(true);
    expect(client.filter((r) => col(r, "EcritureLet") === "")).toHaveLength(3);
    const old = rows.filter((r) => col(r, "PieceRef") === "FAC-2025-0042");
    expect(
      old.map((r) => [col(r, "EcritureNum"), col(r, "CompteNum"), col(r, "CompAuxLib")]),
    ).toEqual([
      ["BQ000001", "512000", ""],
      ["BQ000001", "411000", "Syndic Horizon"],
    ]);
  });

  it("names the file after the SIREN and the closing date", () => {
    expect(fecFileName("12345678900012", "2026-12-31")).toBe("123456789FEC20261231.txt");
    expect(letterCode(0)).toBe("AAA");
    expect(letterCode(27)).toBe("ABB");
  });
});

describe("CSV", () => {
  it("writes semicolons with a BOM, escapes quotes and blocks formulas", () => {
    const csv = toCsv(
      ["Réf", "Montant", "Libellé"],
      [
        ["FAC-1", 1234.5, 'Dit "urgent"; vite'],
        ["=HYPERLINK(1)", -12, null],
      ],
    );
    expect(csv.startsWith("﻿Réf;Montant;Libellé\r\n")).toBe(true);
    expect(csv).toContain('FAC-1;1234,50;"Dit ""urgent""; vite"\r\n');
    expect(csv).toContain("'=HYPERLINK(1);-12,00;\r\n");
  });
});
