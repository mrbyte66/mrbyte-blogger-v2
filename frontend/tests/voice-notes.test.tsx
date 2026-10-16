import {act,render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach,expect,it,vi} from "vitest";
import {RecordingButton} from "../components/reading/VoiceNote";
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it("reports denied microphone permission without creating a note",async()=>{
 vi.stubGlobal("navigator",{mediaDevices:{getUserMedia:vi.fn().mockRejectedValue(new Error("denied"))}});vi.stubGlobal("MediaRecorder",class{});
 const recorded=vi.fn();render(<RecordingButton onRecorded={recorded}/>);await userEvent.setup().click(screen.getByRole("button",{name:"Sesli not kaydet"}));expect(screen.getByRole("alert").textContent).toContain("Mikrofona erişilemedi");expect(recorded).not.toHaveBeenCalled();
});
it("releases the microphone if its permission resolves after the note was closed",async()=>{
 let resolve!:(value:MediaStream)=>void;const stop=vi.fn();vi.stubGlobal("navigator",{mediaDevices:{getUserMedia:()=>new Promise<MediaStream>(r=>{resolve=r;})}});vi.stubGlobal("MediaRecorder",class{});
 const view=render(<RecordingButton onRecorded={vi.fn()}/>);await userEvent.setup().click(screen.getByRole("button",{name:"Sesli not kaydet"}));view.unmount();await act(async()=>{resolve({getTracks:()=>[{stop}]}as unknown as MediaStream);});expect(stop).toHaveBeenCalledOnce();
});
