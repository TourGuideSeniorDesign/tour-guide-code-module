import type { TourData } from "../types/tour";

const TOUR: TourData = {
  tourName: "Lafayette College — ECE, 4th Floor (Acopian Engineering Center)",
  slides: [
    {
      id: "welcome",
      title: "Standard Tour Start",
      displayText:
        "Welcome to the fourth floor of Acopian Engineering Center, home to the Electrical and Computer Engineering major at Lafayette.",
      spokenText:
        "Welcome to the fourth floor of Acopian Engineering Center, home to the Electrical and Computer Engineering major at Lafayette.",
      mediaLayout: "split",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-acopian-facade.jpg",
          alt: "Acopian Engineering Center exterior",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-aec-fourth-floor-directory.jpg",
          alt: "Fourth floor directory, Acopian Engineering Center",
        },
      ],
    },
    {
      id: "rpl",
      title: "Rapid Prototyping Lab",
      displayText:
        "On the left is the Rapid Prototyping Lab, equipped with 3D printers, laser cutters and other equipment. After taking the safety course, students have full access to the lab for both class needs and personal projects.",
      spokenText:
        "On the left is the Rapid Prototyping Lab, equipped with 3D printers, laser cutters and other equipment. After taking the safety course, students have full access to the lab for both class needs and personal projects.",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-engineering-students-lab.jpg",
          alt: "Students working in the Rapid Prototyping Lab",
        },
      ],
    },
    {
      id: "soldering-lab",
      title: "Soldering / Electronics Lab",
      displayText:
        "Here is one of the student labs on this floor. This lab is primarily used for our electrical classes like Solid State Circuits. Connected to it is our soldering lab. Students will get the opportunity to learn how to solder in classes or campus-supported activities.",
      spokenText:
        "Here is one of the student labs on this floor. This lab is primarily used for our electrical classes like Solid State Circuits. Connected to it is our soldering lab. Students will get the opportunity to learn how to solder in classes or campus-supported activities. On the opposite wall, there is a collection of images of our students and their activities outside of class.",
      mediaLayout: "slideshow",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-ece-lab-img8264.jpg",
          alt: "Electronics lab workstation",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-ece-lab-img8258.jpg",
          alt: "Soldering and electronics lab equipment",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-ece-lab-dsc0607.jpg",
          alt: "Circuits lab instruments",
        },
      ],
    },
    {
      id: "digital-lab",
      title: "Digital Lab & Projects",
      displayText:
        "The lab here is the Digital Circuits Lab. This lab hosts classes like Digital Electronics and Embedded Systems. As you look around, you may notice a handful of projects from previous students. Starting in their first semester, students do basic design projects as part of ES 101 — Introduction to Engineering. In the ECE courses that follow, students engage in design projects of increasing scope and complexity, culminating in a Senior Capstone Design Project during their final year.",
      spokenText:
        "The lab here is the Digital Circuits Lab. This lab hosts classes like Digital Electronics and Embedded Systems. As you look around, you may notice a handful of projects from previous students. Starting in their first semester, students do basic design projects as part of ES 101 — Introduction to Engineering. In the ECE courses that follow, students engage in design projects of increasing scope and complexity, culminating in a Senior Capstone Design Project, like this autonomous chair, during their final year.",
      mediaLayout: "slideshow",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-ece-lab-dsc0600.jpg",
          alt: "Digital Circuits Lab workstations",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-ece-lafbot-line-follower.jpg",
          alt: "LafBot line-following robot student project",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-ece-autonomous-wheelchair.jpg",
          alt: "Autonomous wheelchair senior capstone project",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-ece-capstone-presentation.jpg",
          alt: "Students presenting capstone design projects",
        },
      ],
    },
    {
      id: "classroom",
      title: "Classroom",
      displayText:
        "This classroom is where most classes in this major are held. Class sizes in this department, especially those offered after your first year, are quite small. This offers more connection to professors and fellow students.",
      spokenText:
        "This classroom is where most classes in this major are held. Class sizes in this department, especially those offered after your first year, are quite small. This offers more connection to professors and fellow students.",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-aec-flex-lab.png",
          alt: "ECE classroom in Acopian Engineering Center",
        },
      ],
    },
    {
      id: "research",
      title: "Research",
      displayText:
        "As part of Lafayette College, many of our professors and students also work on research outside of classes. Through the EXCEL Scholars Program, students can work collaboratively with faculty during the summer on projects that expand the boundaries of knowledge. Senior students desiring to engage in a year-long research project that synthesizes their four years of knowledge may apply to pursue an Honors Thesis.",
      spokenText:
        "As part of Lafayette College, many of our professors and students also work on research outside of classes. Through the EXCEL Scholars Program, students can work collaboratively with faculty during the summer on projects that expand the boundaries of knowledge. Senior students desiring to engage in a year-long research project that synthesizes their four years of knowledge may apply to pursue an Honors Thesis.",
      mediaLayout: "slideshow",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-ece-research-bci.jpg",
          alt: "Student research on brain-computer interfaces",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-ece-capstone-demo.jpg",
          alt: "Student presenting research project",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-ece-health-monitor.jpg",
          alt: "Health monitor student project",
        },
      ],
    },
    {
      id: "community",
      title: "Community",
      displayText:
        "We finish our tour here at room 400, often called the fishbowl, the central location where many of our students meet. Whether being used for group study sessions or club related activities, there is almost always at least one student utilizing this space.",
      spokenText:
        "We finish our tour here at room 400, often called the fishbowl, the central location where many of our students meet. Whether being used for group study sessions or club related activities, there is almost always at least one student utilizing this space.",
      mediaLayout: "split",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-aec-collaboration-space.png",
          alt: "AEC 400 fishbowl collaboration space",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-ece-students-activities.jpg",
          alt: "ECE students and community activities",
        },
      ],
    },
    {
      id: "faq-study-abroad",
      title: "Study Abroad",
      displayText:
        "Yes, there are opportunities to study in Madrid, Germany and other countries for a semester, or a three-week period while still completing the ECE degree in four years. Please consult your adviser about available study abroad programs to discuss their fit within your entire ECE schedule.",
      spokenText:
        "Yes, there are opportunities to study in Madrid, Germany and other countries for a semester, or a three-week period while still completing the ECE degree in four years. Please consult your adviser about available study abroad programs to discuss their fit within your entire ECE schedule.",
      media: [],
    },
    {
      id: "faq-accreditation",
      title: "Degree Accreditation",
      displayText:
        "Yes, the degree is accredited by the Engineering Accreditation Commission of the Accreditation Board for Engineering and Technology (ABET). See the Department ABET Page for more information.",
      spokenText:
        "Yes, the degree is accredited by the Engineering Accreditation Commission of the Accreditation Board for Engineering and Technology (ABET). See the Department ABET Page for more information.",
      media: [],
    },
    {
      id: "faq-degree-type",
      title: "Degree Type",
      displayText:
        "The degree is a Bachelor of Science in Electrical AND Computer Engineering (B.S. ECE). The curriculum is structured so that core courses in both electrical engineering and computer engineering are covered. A variety of electives support both aspects of the discipline. Thus, the B.S. ECE curriculum is designed to give graduates a solid background in electrical and computer engineering. Given the synergy between electrical engineering and computer engineering, we believe that this is the best approach and will prepare students for both a broader employment market and areas of study in graduate school.",
      spokenText:
        "The degree is a Bachelor of Science in Electrical AND Computer Engineering (B.S. ECE). The curriculum is structured so that core courses in both electrical engineering and computer engineering are covered. A variety of electives support both aspects of the discipline. Thus, the B.S. ECE curriculum is designed to give graduates a solid background in electrical and computer engineering. Given the synergy between electrical engineering and computer engineering, we believe that this is the best approach and will prepare students for both a broader employment market and areas of study in graduate school.",
      media: [],
    },
  ],
};

export async function fetchTourData(): Promise<TourData> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(TOUR), 300);
  });
}
