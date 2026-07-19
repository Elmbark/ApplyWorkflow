#import "@preview/clickworthy-resume:1.0.1": *

// Personal Information (placeholders filled by the app)
#let name = "{{ name }}"
#let email = "{{ email }}"
#let github = "github.com/{{ github }}"
#let linkedin = "linkedin.com/in/{{ linkedin }}"
#let contacts = (
  [#link("mailto:" + email)[#email]],
  [#link("https://" + github)[#github]],
  [#link("https://" + linkedin)[#linkedin]],
)
#let location = "{{ location }}"

#let summary = "{{ summary }}"

#let theme = rgb("#26428b")
#let font = "New Computer Modern"
#let fontSize = 11pt
#let lang = "en"
#let margin = (
  top: 1cm,
  bottom: 1cm,
  left: 1cm,
  right: 1cm,
)

#show: resume.with(
  author: name,
  location: location,
  contacts: contacts,
  summary: summary,
  theme-color: theme,
  font: font,
  font-size: fontSize,
  lang: lang,
  margin: margin,
)

= Target Role
Applying for: {{ post }} at {{ company }}

= Skills
#skills((
  ("Expertise", (
    [Distributed Systems],
    [Real-Time Operating Systems],
    [Signal Processing],
    [Embedded Security],
    [FPGA Architectures],
    [System-on-Chip Design],
    [Software Reliability],
    [Technical Leadership],
  )),
  ("Software", (
    [C/C++],
    [Rust],
    [SystemVerilog],
    [Matlab],
    [Linux Kernel],
    [Docker],
    [Kubernetes],
    [Jenkins],
    [gRPC],
    [Git],
    [Yocto Project],
  )),
  ("Languages", (
    [Python],
    [C/C++],
    [Rust],
    [Shell],
    [SystemVerilog],
    [VHDL],
  )),
))

= Role Keywords
{{ keywords }}

= Experience
#exp(
  title: "Distinguished Engineer",
  organization: "Northwest Embedded Systems",
  date: "2012 - 2022",
  location: "San Jose, CA",
  details: [
    - Led the architecture and design of a secure FPGA-based communications platform for aerospace clients.
    - Built a distributed sensor fusion system used in industrial robotics with >99.99% reliability.
    - Mentored a cross-functional team of 12 engineers, fostering internal leadership and a publishing culture.
    - Drove the internal R&D-to-productization cycle for a real-time embedded analytics engine.
    - Co-authored three internal patents on low-power data routing and compression techniques.
  ]
)

#exp(
  title: "Senior Systems Engineer",
  organization: "Photonix Technologies",
  date: "2006 - 2012",
  location: "Mountain View, CA",
  details: [
    - Designed a firmware update system for remote industrial devices deployed in volatile environments.
    - Developed mixed-signal driver modules interfacing with custom ASICs and microcontrollers.
    - Improved inter-device communication protocols, reducing latency by 35% across product lines.
  ]
)

#exp(
  title: "Embedded Software Engineer",
  organization: "MicroNova Inc.",
  date: "2001 - 2006",
  location: "Austin, TX",
  details: [
    - Delivered firmware for low-latency DSP filters used in medical and automotive devices.
    - Ported real-time schedulers to custom embedded targets using bare-metal C.
  ]
)

= Education
#edu(
  institution: "University of California, Berkeley",
  date: "1996 - 2001",
  location: "Berkeley, CA",
  degrees: (
    ("Ph.D.", "Electrical Engineering and Computer Sciences"),
  ),
  extra: "Advisor: Prof. Margaret Wang",
)

#edu(
  institution: "University of California, Berkeley",
  date: "1992 - 1996",
  location: "Berkeley, CA",
  degrees: (
    ("B.S.", "Electrical Engineering"),
  ),
  gpa: "3.92",
  extra: "Graduated with Honors (Summa Cum Laude)",
)