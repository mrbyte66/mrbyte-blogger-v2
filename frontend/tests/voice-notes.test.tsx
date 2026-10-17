import {act,fireEvent,render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach,expect,it,vi} from "vitest";
import {RecordingButton,VoicePlayback} from "../components/reading/VoiceNote";
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it("reports denied microphone permission without creating a note",async()=>{
 vi.stubGlobal("navigator",{mediaDevices:{getUserMedia:vi.fn().mockRejectedValue(new Error("denied"))}});vi.stubGlobal("MediaRecorder",class{});
 const recorded=vi.fn();render(<RecordingButton onRecorded={recorded}/>);await userEvent.setup().click(screen.getByRole("button",{name:"Sesli not kaydet"}));expect(screen.getByRole("alert").textContent).toContain("Mikrofona erişilemedi");expect(recorded).not.toHaveBeenCalled();
});
it("releases the microphone if its permission resolves after the note was closed",async()=>{
 let resolve!:(value:MediaStream)=>void;const stop=vi.fn();vi.stubGlobal("navigator",{mediaDevices:{getUserMedia:()=>new Promise<MediaStream>(r=>{resolve=r;})}});vi.stubGlobal("MediaRecorder",class{});
 const view=render(<RecordingButton onRecorded={vi.fn()}/>);await userEvent.setup().click(screen.getByRole("button",{name:"Sesli not kaydet"}));view.unmount();await act(async()=>{resolve({getTracks:()=>[{stop}]}as unknown as MediaStream);});expect(stop).toHaveBeenCalledOnce();
});

it("plays compact recordings only on demand and seeks independently",async()=>{
 const play=vi.spyOn(HTMLMediaElement.prototype,"play").mockImplementation(function(this:HTMLMediaElement){fireEvent.play(this);return Promise.resolve();});
 vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(function(this:HTMLMediaElement){fireEvent.pause(this);});
 vi.stubGlobal("URL",{createObjectURL:vi.fn(()=>"blob:voice-test"),revokeObjectURL:vi.fn()});
 const view=render(<VoicePlayback compact durationMs={10000} label="Kayıt 2" load={async()=>new Blob(["voice"])}/>);
 const button=await screen.findByRole("button",{name:"Oynat: Kayıt 2"});expect(play).not.toHaveBeenCalled();
 await userEvent.setup().click(button);expect(play).toHaveBeenCalledOnce();expect(screen.getByRole("button",{name:"Duraklat: Kayıt 2"})).toBeTruthy();
 fireEvent.change(screen.getByRole("slider",{name:"Ses konumu: Kayıt 2"}),{target:{value:"4"}});expect(view.container.querySelector("audio")?.currentTime).toBe(4);
 view.unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:voice-test");
});
