#import "@preview/simple-technical-resume:0.1.1": *

#let name = "{{ name }}"
#let phone = "{{ phone }}"
#let email = "{{ email }}"
#let github = "{{ github }}"
#let linkedin = "{{ linkedin }}"
#let personal-site = "{{ personal_site }}"
#let location = "{{ location }}"

#show: resume.with(
  top-margin: 0.18in,
  bottom-margin: 0.15in,
  left-margin: 0.22in,
  right-margin: 0.22in,
  font-size: 8.2pt,
  personal-info-font-size: 7.2pt,
  author-position: center,
  personal-info-position: center,
  author-name: name,
  phone: phone,
  location: location,
  email: email,
  website: personal-site,
  linkedin-user-id: linkedin,
  github-username: github
)

#custom-title("Summary")[
  #skills()[
  Software engineer with over two years of experience building production-ready systems using an MVP-driven approach, focused on delivering scalable, reliable, and maintainable backend services from prototype to deployment.
  
  Strong foundation in software engineering fundamentals, including clean code, system design principles, and common design patterns, with an emphasis on building maintainable, scalable architectures.

  Comfortable in Agile environments, possessing strong time management skills, contributing to sprint planning, iterative delivery, and cross-functional collaboration to consistently deliver production-ready features on schedule.
  
  Hands-on experience delivering end-to-end backend services, ensuring testability, documentation, and operational readiness for real-world usage.
  ]
]

#custom-title("Experience")[
  #work-heading(
    "Software Engineering ",
    link("https://www.itransform365.com/")[Itransform365],
    "France (Remote)",
    datetime(year: 2025, month: 3, day: 1),
    datetime(year: 2026, month: 6, day: 1),
  )[
 - AI Collaboration Platform: Built backend services powering an internal AI collaboration system, designed the MCP integration layer connecting LLM-based assistants to internal tools, implemented the API endpoints and event hooks that trigger and coordinate automated workflows, and added monitoring instrumentation to track agent execution status and detect real-time failures.
	- LLM Deployment & Optimization: Deployed LLMs in production with vLLM, built serving infrastructure, and optimized batching, memory, and token usage to reduce costs while maintaining low latency.
	- Real-time Data Pipeline: Utilized CDC to stream database changes, transform raw events into structured records, and enforce governance and privacy controls. Modeled the processed data into knowledge graphs that power semantic search APIs, improving data freshness, search relevance, and overall data usability across downstream systems.
  ]

  #work-heading(
    "Freelance Cloud Deployment & SRE",
    "YAFA-Group",
    "Remote",
    datetime(year: 2024, month: 8, day: 1),
    datetime(year: 2024, month: 12, day: 1),
  )[
    - Led client discovery, scoping, and quoting; managed the end-to-end cloud deployment of a production full-stack web application.
    - Deployed on OVH Cloud, configured DNS, and automated SSL/TLS certificate renewal via Certbot; set up uptime checks and recurring status summaries.
    - Monitored and maintained cloud infrastructure for #link("https://yafagroup.tn")[yafagroup.tn], sustaining 99.9% uptime through proactive monitoring and responsive support.
  ]

  #work-heading(
    "Full-Stack Developer (Angular/Spring Boot)",
    link("https://www.kmf.com.tn/")[KMF Business Solutions],
    "Sfax, Tunisia",
    datetime(year: 2023, month: 10, day: 1),
    datetime(year: 2024, month: 8, day: 1),
  )[
    - Delivered a Costing Study (Étude de Chiffrage) ERP module automating estimations, quotes, and financial calculations; gathered business rules with finance and sales teams and produced functional specs.
    - Built backend REST APIs in Java with Spring Boot, Hibernate/JPA, and PostgreSQL, including API documentation and Postman test collections for onboarding.
    - Developed responsive UIs with Angular and TypeScript to streamline quoting and invoicing workflows.
  ]

  #work-heading(
    "DevOps Intern",
    link("https://www.kmf.com.tn/")[KMF Business Solutions],
    "Sfax, Tunisia",
    datetime(year: 2023, month: 6, day: 1),
    datetime(year: 2023, month: 9, day: 1),
  )[
    - Built a CI/CD pipeline with GitLab CI/CD and Jenkins that shortened build, test, and release cycles for the engineering team.
    - Authored a step-by-step pipeline playbook and quick-reference notes, and summarized deployment metrics in weekly team reviews.
    - Automated environment configuration and service orchestration with Ansible, reducing manual deployment errors.
    - Configured and managed Hyper-V virtualization hosts for isolated staging environments with release checklists for handoffs.
  ]

  #work-heading(
    "Big Data & Data Governance Intern",
    link("https://www.dksoft.tn/")[DK-SOFT],
    "Sfax, Tunisia",
    datetime(year: 2023, month: 4, day: 1),
    datetime(year: 2023, month: 5, day: 1),
  )[
    - Configured and deployed a production-grade big data governance and catalog stack across a 14-machine cluster (Zookeeper, Hadoop, HBase, Hive, Kafka, Solr, Apache Atlas, Ranger).
    - Built a custom Java API linking HDFS file operations with Apache Atlas metadata tracking and documented the integration steps.
    - Produced setup guides and an overview deck explaining data lineage, access control, and catalog value to non-technical stakeholders.
  ]
]


#custom-title("Projects")[
  #project-heading(
    "Retrieval Augmented Generation (RAG)",
    project-url: "https://github.com/Elmbark"
  )[
    - Fine-tuned multilingual LLMs on a custom Tunisian Arabic dialect corpus to enable context-aware semantic search.
    - Built a document preprocessing, vectorization, and cosine similarity retrieval pipeline using Ollama and Word2Vec and documented the steps for reproducibility.
    #pad(left: 1.0em)[Ollama, Word2Vec, Cosine Similarity, Fine-Tuning, Deep Learning, Pipelines]
  ]
]

#custom-title("Education")[
  #education-heading(
    "Faculty of Economics and Management Sfax", "Sfax, Tunisia",
    "Master's Degree", "Data Science and Engineering",
    datetime(year: 2023, month: 9, day: 1),
    "Present"
  )[
    - *Key Coursework:* Distributed Systems, Big Data Architectures, Advanced Machine Learning, Cloud Computing & SRE
  ]
  
  #education-heading(
    "Faculty of Sciences Sfax", "Sfax, Tunisia",
    "Licence", "Computer Systems Engineering",
    datetime(year: 2020, month: 9, day: 1),
    datetime(year: 2023, month: 6, day: 1)
  )[
    - *Key Coursework:* Software Engineering, Database Management Systems, Data Structures & Algorithms, Operating Systems
  ]
]

#custom-title("Skills & Languages")[
  #skills()[
    - *Programming Languages:* Java, Python, SQL, JavaScript
    - *Streaming & Messaging (real-time data flow):* Apache Kafka, Change Data Capture, Neo4j
    - *Backend & APIs:* Spring Boot, Hibernate/JPA, PostgreSQL, REST API design
    - *Cloud & Containerization:* Docker, AWS, OVH Cloud, Ansible, Kubernetes
    - *CI/CD & Monitoring:* GitLab CI/CD, Jenkins, Prometheus, Grafana
    - *AI & Data Science:* Machine Learning, RAG, agents, MCP
    - *Spoken Languages:* Arabic (Native), English (B2), French (B1)
  ]
]
