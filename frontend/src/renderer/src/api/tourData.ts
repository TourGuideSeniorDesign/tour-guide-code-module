import type { TourData } from "../types/tour";

/** Imagery is downloaded from official Lafayette sites; see `frontend/scripts/download-tour-images.sh`. */
const TOUR: TourData = {
  tourName: "Lafayette College — ECE, 4th Floor (Acopian Engineering Center)",
  slides: [
    {
      id: "welcome",
      title: "ECE on the 4th floor",
      displayText:
        "This tour stays on the fourth floor of the Acopian Engineering Center (AEC), home to Electrical and Computer Engineering labs and research. Lafayette’s main engineering entrance is on the third floor—use the elevators or stairs to reach the ECE floor.",
      spokenText:
        "Welcome! Today we're touring only the fourth floor of the Acopian Engineering Center — that's where Lafayette's Electrical and Computer Engineering labs and research spaces are gathered. Remember: the main entrance to the building is on level three, so you'll take the stairs or elevator up one level to reach the ECE floor. Let's take a look.",
      mediaLayout: "split",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-acopian-facade.jpg",
          alt: "Acopian Engineering Center exterior (Lafayette College)",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-aec-fourth-floor-directory.jpg",
          alt: "Fourth floor directory, Acopian Engineering Center",
        },
      ],
    },
    {
      id: "floor-overview",
      title: "What’s on this floor",
      displayText: "",
      spokenText: "",
      mediaLayout: "segments",
      media: [],
      segments: [
        {
          displayText:
            "Fourth-floor ECE spaces include AEC 402 (Rapid Prototyping / Circuits & Control Systems Lab per college listings), AEC 404 (Controls and Circuits Lab), AEC 410 (Electronics / Signals & Systems), AEC 412 (soldering room), AEC 419 (Digital Circuits & Computer Systems), AEC 423 (Biomedical Instrumentation Research), and the Projects Lab in AEC 406.",
          spokenText:
            "On the fourth floor you'll find the Rapid Prototyping Lab in four-oh-two — that's the Circuits and Control Systems Lab. Four-oh-four is the Controls and Circuits Lab. Four-ten is Electronics and Signals and Systems. Four-twelve is the dedicated soldering room. Four-nineteen is Digital Circuits and Computer Systems. Four-twenty-three is the Biomedical Instrumentation Research Lab. And four-oh-six is the Projects Lab, open for assembly and prototyping.",
          media: [
            {
              type: "image",
              url: "/tour-images/lafayette-aec-fourth-floor.jpg",
              alt: "Fourth floor, Acopian Engineering Center",
            },
          ],
        },
        {
          displayText:
            "Instructional labs are available outside scheduled class times, including evenings and weekends — check the department for open hours and access policies.",
          spokenText:
            "Like the department says on its website, these instructional labs are meant for student use whenever a formal section isn't meeting — including evenings and weekends. Always confirm access and safety rules with ECE or engineering staff.",
          media: [
            {
              type: "image",
              url: "/tour-images/lafayette-ece-lab-interior.jpg",
              alt: "ECE laboratory interior, Acopian Engineering Center",
            },
          ],
        },
      ],
    },
    {
      id: "digital-lab",
      title: "Digital Circuits & Computer Systems — AEC 419",
      displayText: "",
      spokenText: "",
      mediaLayout: "segments",
      media: [],
      segments: [
        {
          displayText:
            "Used for required digital courses and the embedded systems elective: Verilog HDL, C, microcontrollers, and FPGA work. Equipment includes dual-boot Linux/Windows PCs, mixed-signal scopes, Digilent Nexsys4 boards, and Microchip PIC32 kits. Six workstations, teams of two.",
          spokenText:
            "Room four-nineteen is the Digital Circuits and Computer Systems Laboratory — digital logic, Verilog, C programming, and embedded systems. Each station has dual-boot PCs, mixed-signal oscilloscopes, power supplies, function generators, Digilent Nexsys-4 FPGA boards, and PIC thirty-two boards. Students work in pairs at six benches.",
          media: [
            {
              type: "image",
              url: "/tour-images/lafayette-ece-lab-dsc0599.jpg",
              alt: "ECE lab benches, Lafayette College",
            },
          ],
        },
        {
          displayText:
            "Projects span a pulse monitor using infrared sensing, LED-matrix controllers, line-following robots, capacitance meters, DDS audio, and touch-screen games — with open-ended finals such as wireless buzzers or fingerprint-based doorbells.",
          spokenText:
            "Course projects run from a pulse-rate monitor in Digital Design One to scrolling LED signs and line-following robots in Digital Design Two. Embedded Systems adds systems like capacitance meters and virtual whack-a-mole. Finals are often student-designed — past examples include a wireless game-buzzer set and a musical fingerprint doorbell.",
          media: [
            {
              type: "image",
              url: "/tour-images/lafayette-ece-lab-dsc0600.jpg",
              alt: "ECE lab workstations, Lafayette College",
            },
          ],
        },
      ],
    },
    {
      id: "circuits-lab",
      title: "Circuits & Control Systems — AEC 402",
      displayText:
        "Supports ECE 221 (intro circuits), ECE 433 (Feedback Control Systems), and ECE 434 (Digital Signal Processing). Six PCs with PSpice, bench instruments, MATLAB toolboxes, and Quanser mechatronics units — up to 18 students per section in teams of two. The building directory also lists AEC 404 as the Controls and Circuits Lab on the same floor.",
      spokenText:
        "Four-oh-two is the Circuits and Control Systems Laboratory — intro circuits, feedback controls, and digital signal processing. There are six PCs with PSpice, full bench gear, MATLAB toolboxes, and Quanser mechatronics hardware. Labs progress from linear circuits and filters to hardware-in-the-loop control with MATLAB and Simulink, and TI DSP boards for speech and imaging. The floor directory also lists the Controls and Circuits Lab in room four-oh-four.",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-ece-lab-dsc0607.jpg",
          alt: "ECE circuits laboratory equipment, Lafayette College",
        },
      ],
    },
    {
      id: "electronics-lab",
      title: "Electronics Circuits & Systems — AEC 410",
      displayText:
        "Used for two required electronics courses, electromagnetics, advanced electives, and project work. Seven PCs with Smartspice, MATLAB, Mathcad, Silvaco IC tools, Mentor Graphics PCB layout, and Verilog — six instrumented workstations for teams of two.",
      spokenText:
        "Four-ten is Electronics Circuits and Systems — solid-state circuits, analog IC concepts, and electromagnetics. Software spans Smartspice, MATLAB, Mathcad, Silvaco, Mentor Graphics for boards, and Verilog. The second electronics course ends with a mixed-signal capstone: specify, simulate, build, and demo real hardware.",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-ece-lab-interior.jpg",
          alt: "ECE electronics laboratory, Lafayette College",
        },
      ],
    },
    {
      id: "projects-lab",
      title: "Projects Lab & soldering — AEC 406 / AEC 412",
      displayText:
        "AEC 406 is the Projects Laboratory — open to all ECE students, with four workstations for through-hole and surface-mount assembly. Each bench has a temperature-controlled soldering station, fume extractor, and lead-free solder. The Vision Engineering Mantis Elite 3-D microscope supports inspection and rework. AEC 412 is the dedicated soldering room on the same floor.",
      spokenText:
        "Room four-oh-six is the Projects Lab — first-years through seniors — with four fully outfitted benches for through-hole and surface-mount work, including soldering stations and fume extractors. The Mantis Elite microscope helps with inspection. And four-twelve on the same floor is the soldering room listed in the building directory.",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-ece-lab-dsc0600.jpg",
          alt: "ECE project assembly area, Lafayette College",
        },
      ],
    },
    {
      id: "biomed-lab",
      title: "Biomedical Instrumentation Research — AEC 423",
      displayText:
        "Led by Prof. Yih-Choung Yu: biosignal acquisition (g.HIamp), dynamic signal analysis, Fastcam X1280 imaging, Transonic flow meters, Quanser Q8 DAQ, and bridge amplifiers. Research spans cardiovascular modeling, ventricular assist devices, ultrasound probe control, and brain–computer interfaces.",
      spokenText:
        "Four-twenty-three is the Biomedical Instrumentation Research Lab led by Professor Yih-Choung Yu — g.HIamp biosignal recording, dynamic signal analysis, high-speed imaging, flow measurement, and Quanser data acquisition. Projects have ranged from cardiovascular modeling and ventricular assist devices to ultrasound control and brain-computer interfaces for robotics.",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-ece-lab-dsc0599.jpg",
          alt: "ECE research laboratory benches, Lafayette College",
        },
      ],
    },
    {
      id: "farewell",
      title: "Thanks for touring the 4th floor",
      displayText:
        "For current lab lists, equipment, and access policies, use ece.lafayette.edu and the Acopian Engineering Center directory on engineering.lafayette.edu.",
      spokenText:
        "Thanks for touring Lafayette ECE on the fourth floor of the Acopian Engineering Center. For the latest room lists, equipment, and lab access, visit ece dot lafayette dot edu and the engineering school's Acopian directory. Go Leopards!",
      mediaLayout: "split",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-aec-fourth-floor-directory.jpg",
          alt: "Fourth floor directory, Acopian Engineering Center",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-aec-fourth-floor.jpg",
          alt: "Fourth floor, Acopian Engineering Center",
        },
      ],
    },
  ],
};

export async function fetchTourData(): Promise<TourData> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(TOUR), 300);
  });
}
