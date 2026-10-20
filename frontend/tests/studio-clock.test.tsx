import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudioClock } from "../components/builder/StudioClock";

const label = () => screen.getByLabelText("Tarih ve saat");
const date = (value: Date) => new Intl.DateTimeFormat("tr-TR", {weekday:"long",day:"numeric",month:"long"}).format(value);
const hour = (value: Date) => new Intl.DateTimeFormat("tr-TR", {hour:"2-digit",minute:"2-digit"}).format(value);
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026,9,20,23,59,50)); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Studio local clock", () => {
  it("updates the date and hour together at midnight, on the minute boundary", () => {
    render(<StudioClock/>);
    const before = new Date();
    expect(label().textContent).toContain(date(before));
    expect(label().textContent).toContain(hour(before));
    act(() => vi.advanceTimersByTime(10_000));
    expect(label().textContent).toContain(date(new Date()));
    expect(label().textContent).toContain(hour(new Date()));
    expect(label().getAttribute("datetime")).toBe(new Date().toISOString());
    expect(date(before)).not.toBe(date(new Date()));
  });
  it("catches up after an inactive tab and disposes its scheduled update on unmount", () => {
    const {unmount}=render(<StudioClock/>);
    const visible=vi.spyOn(document,"visibilityState","get").mockReturnValue("visible");
    vi.setSystemTime(new Date(2026,9,21,8,15,20));
    fireEvent(document,new Event("visibilitychange"));
    expect(label().textContent).toContain(hour(new Date()));
    expect(vi.getTimerCount()).toBe(1);
    visible.mockReturnValue("hidden");
    vi.setSystemTime(new Date(2026,9,21,8,17,20));
    fireEvent(document,new Event("visibilitychange"));
    expect(label().textContent).toContain("08:15");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
