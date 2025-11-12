/**
 * Comprehensive demo data seeders for the Kimia platform.
 *
 * These actions and queries are intended for local development and staging
 * environments only. They create fully-populated calls, proposals, users,
 * bookmarks, FAQs, and evaluation artefacts so features can be demonstrated
 * without manual setup.
 */

import { action, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createAccount } from "@convex-dev/auth/server";

// Debug query to check proposals
export const debugProposals = query({
  args: {},
  handler: async (ctx) => {
    const proposals = await ctx.db.query("proposals").collect();
    return proposals.map((p) => ({
      _id: p._id,
      title: p.title,
      status: p.status,
      budgetTotal: p.budget?.total,
      callId: p.callId,
    }));
  },
});

// -----------------------------------------------------------------------------
// Seed configuration
// -----------------------------------------------------------------------------

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role:
    | "sysadmin"
    | "admin"
    | "evaluator"
    | "faculty"
    | "finance"
    | "observer";
  campus?: string;
  department?: string;
};

const SEED_USERS: SeedUser[] = [
  {
    name: "Sofía System",
    email: "sysadmin@kimia.demo",
    password: "Passw0rd!",
    role: "sysadmin",
    campus: "Santiago",
  },
  {
    name: "Diego Coordinator",
    email: "admin@kimia.demo",
    password: "Passw0rd!",
    role: "admin",
    campus: "Temuco",
    department: "Innovación Docente",
  },
  {
    name: "Eva Reviewer",
    email: "eva.reviewer@kimia.demo",
    password: "Passw0rd!",
    role: "evaluator",
  },
  {
    name: "Mia Evaluator",
    email: "mia.reviewer@kimia.demo",
    password: "Passw0rd!",
    role: "evaluator",
  },
  {
    name: "Carlos Faculty",
    email: "carlos.faculty@kimia.demo",
    password: "Passw0rd!",
    role: "faculty",
    campus: "Talca",
    department: "Educación",
  },
  {
    name: "Laura Faculty",
    email: "laura.faculty@kimia.demo",
    password: "Passw0rd!",
    role: "faculty",
    campus: "Santiago",
    department: "Ingeniería",
  },
  {
    name: "Felipe Finance",
    email: "felipe.finance@kimia.demo",
    password: "Passw0rd!",
    role: "finance",
  },
  {
    name: "Inés Observer",
    email: "ines.observer@kimia.demo",
    password: "Passw0rd!",
    role: "observer",
  },
];

const SEED_EVALUATION_CRITERIA = [
  {
    name: "Innovación pedagógica",
    description: "Originalidad y potencial transformador de la propuesta",
    weight: 25,
    maxScore: 5,
    type: "innovation" as const,
    scale: [
      { score: 5, descriptor: "Transforma significativamente la docencia" },
      { score: 3, descriptor: "Introduce mejoras moderadas" },
      { score: 1, descriptor: "Impacto limitado o incremental" },
    ],
  },
  {
    name: "Impacto esperado",
    description: "Cobertura, beneficiarios y alineamiento institucional",
    weight: 25,
    maxScore: 5,
    type: "impact" as const,
    scale: [
      { score: 5, descriptor: "Alcance institucional y evaluable" },
      { score: 3, descriptor: "Impacto acotado pero relevante" },
      { score: 1, descriptor: "Impacto poco claro" },
    ],
  },
  {
    name: "Factibilidad",
    description: "Coherencia de metodología, equipo y recursos",
    weight: 25,
    maxScore: 5,
    type: "feasibility" as const,
    scale: [
      { score: 5, descriptor: "Plan sólido con riesgos mitigados" },
      { score: 3, descriptor: "Requiere ajustes" },
      { score: 1, descriptor: "Plan insuficiente" },
    ],
  },
  {
    name: "Presupuesto",
    description: "Uso eficiente y justificado de recursos",
    weight: 25,
    maxScore: 5,
    type: "budget" as const,
    scale: [
      { score: 5, descriptor: "Presupuesto detallado y alineado" },
      { score: 3, descriptor: "Algunas partidas requieren mayor detalle" },
      { score: 1, descriptor: "Presupuesto inconsistente" },
    ],
  },
];

// -----------------------------------------------------------------------------
// Call seeds
// -----------------------------------------------------------------------------

type CallSeed = {
  title: string;
  description: string;
  projectType: string;
  targetAudience: string[];
  objectives: string[];
  openOffsetDays: number;
  closeOffsetDays: number;
  evaluationOffsets: {
    start: number;
    end: number;
    decision: number;
    projectStart: number;
    projectEnd: number;
  };
  budget: {
    total: number;
    min: number;
    max: number;
    allowedCategories: string[];
    justificationThreshold: number;
    notes?: string;
  };
  eligibility: {
    campuses: string[];
    departments: string[];
    academicRanks: string[];
    qualifications: string[];
    requiredRoles: string[];
    teamMin: number;
    teamMax: number;
    notes?: string;
    conflictPolicies: string[];
  };
  documents: {
    required: string[];
    optional: string[];
  };
  evaluationSettings: {
    evaluatorsRequired: number;
    blindReview: boolean;
    assignmentMethod: "manual" | "auto_balanced" | "ai_matched";
    conflictPolicies: string[];
  };
  evaluationCriteriaNames: string[];
  faqs: Array<{ question: string; answer: string; category?: string }>;
};

const SEED_CALLS: CallSeed[] = [
  {
    title: "Innovación Docente 2025",
    description:
      "Financia proyectos que transformen la experiencia de aprendizaje con metodologías activas y herramientas digitales.",
    projectType: "Educational Innovation",
    targetAudience: ["Faculty", "Academic Departments"],
    objectives: [
      "Fomentar experiencias de aprendizaje activo",
      "Documentar prácticas exitosas para su escalamiento",
      "Impulsar la colaboración inter-campus",
    ],
    openOffsetDays: -7,
    closeOffsetDays: 21,
    evaluationOffsets: {
      start: 22,
      end: 36,
      decision: 40,
      projectStart: 60,
      projectEnd: 360,
    },
    budget: {
      total: 60000000,
      min: 5000000,
      max: 15000000,
      allowedCategories: [
        "Equipment",
        "Professional development",
        "Learning materials",
      ],
      justificationThreshold: 800000,
      notes: "Hasta un 10% puede destinarse a gestión del proyecto",
    },
    eligibility: {
      campuses: ["Santiago", "Temuco", "Talca"],
      departments: ["Educación", "Ingeniería", "Ciencias de la Salud"],
      academicRanks: ["Assistant Professor", "Associate Professor", "Full Professor"],
      qualifications: ["Carta de apoyo del decano", "Asignación docente activa"],
      requiredRoles: ["Investigador Principal", "Diseñador Pedagógico"],
      teamMin: 2,
      teamMax: 6,
      notes: "Al menos un integrante debe ser docente emergente",
      conflictPolicies: [
        "Evaluadores deben declararse inhabilitados si han colaborado con el PI en los últimos 3 años.",
      ],
    },
    documents: {
      required: ["Project proposal PDF", "Budget spreadsheet", "Dean approval letter"],
      optional: ["Letters of support"],
    },
    evaluationSettings: {
      evaluatorsRequired: 3,
      blindReview: true,
      assignmentMethod: "auto_balanced",
      conflictPolicies: ["Evaluadores deben declarar conflictos antes de revisar."],
    },
    evaluationCriteriaNames: [
      "Innovación pedagógica",
      "Impacto esperado",
      "Factibilidad",
      "Presupuesto",
    ],
    faqs: [
      {
        question: "¿Podemos colaborar entre campus?",
        answer: "Sí, los proyectos inter-campus tienen prioridad en la evaluación.",
      },
      {
        question: "¿Se aceptan materiales en inglés?",
        answer: "El informe final debe entregarse en español; anexos pueden estar en inglés.",
      },
    ],
  },
  {
    title: "Transformación Digital Académica",
    description:
      "Apoya iniciativas que modernicen los procesos académicos con herramientas digitales y analítica de datos.",
    projectType: "Digital Transformation",
    targetAudience: ["Faculty", "IT Units"],
    objectives: [
      "Implementar analítica para el éxito estudiantil",
      "Mejorar el acceso a servicios académicos",
      "Fortalecer capacidades digitales institucionales",
    ],
    openOffsetDays: -50,
    closeOffsetDays: -7,
    evaluationOffsets: {
      start: -6,
      end: 12,
      decision: 18,
      projectStart: 45,
      projectEnd: 365,
    },
    budget: {
      total: 90000000,
      min: 12000000,
      max: 22000000,
      allowedCategories: ["Software licenses", "Infrastructure upgrades", "Specialized consulting"],
      justificationThreshold: 1000000,
      notes: "Hardware debe incluir plan de mantenimiento a 3 años",
    },
    eligibility: {
      campuses: ["Todos"],
      departments: ["Tecnologías de Información", "Vicerrectoría Académica"],
      academicRanks: ["Administrative leadership", "Faculty"],
      qualifications: ["Charter del proyecto", "Patrocinio de VRA"],
      requiredRoles: ["Project Lead", "Technical Lead", "Change Management Lead"],
      teamMin: 3,
      teamMax: 8,
      conflictPolicies: ["Vínculos con proveedores deben declararse antes de evaluar."],
    },
    documents: {
      required: ["Implementation roadmap", "Budget spreadsheet", "Risk assessment"],
      optional: ["Vendor quotes"],
    },
    evaluationSettings: {
      evaluatorsRequired: 4,
      blindReview: false,
      assignmentMethod: "manual",
      conflictPolicies: ["No pueden evaluar propuestas preparadas por su unidad."],
    },
    evaluationCriteriaNames: [
      "Impacto esperado",
      "Factibilidad",
      "Presupuesto",
    ],
    faqs: [
      {
        question: "¿Se financian migraciones a la nube?",
        answer: "Sí, siempre que cumplan con políticas de seguridad institucional.",
      },
      {
        question: "¿Se pueden incluir asistentes estudiantiles?",
        answer: "Sí, si participan en la implementación tecnológica.",
        category: "Finanzas",
      },
    ],
  },
  {
    title: "Laboratorios de Innovación Curricular",
    description:
      "Convoca propuestas piloto para rediseñar mallas curriculares con enfoque basado en competencias.",
    projectType: "Curricular Innovation",
    targetAudience: ["Faculty"],
    objectives: [
      "Diseñar experiencias orientadas a resultados de aprendizaje",
      "Involucrar a actores externos en la co-creación curricular",
    ],
    openOffsetDays: -60,
    closeOffsetDays: -10,
    evaluationOffsets: {
      start: -5,
      end: 10,
      decision: 20,
      projectStart: 40,
      projectEnd: 340,
    },
    budget: {
      total: 45000000,
      min: 3000000,
      max: 10000000,
      allowedCategories: ["Workshops", "Consulting", "Pilots"],
      justificationThreshold: 600000,
    },
    eligibility: {
      campuses: ["Santiago", "Talca"],
      departments: ["Educación", "Negocios"],
      academicRanks: ["Assistant Professor", "Associate Professor"],
      qualifications: ["Plan de trabajo semestral"],
      requiredRoles: ["Coordinador académico", "Especialista en currículo"],
      teamMin: 2,
      teamMax: 5,
      conflictPolicies: ["Declarar vínculo con consultoras externas."],
    },
    documents: {
      required: ["Curriculum redesign brief", "Budget spreadsheet"],
      optional: ["Letters of intent"],
    },
    evaluationSettings: {
      evaluatorsRequired: 2,
      blindReview: true,
      assignmentMethod: "ai_matched",
      conflictPolicies: ["El algoritmo evita asignar evaluadores de la misma facultad."],
    },
    evaluationCriteriaNames: ["Innovación pedagógica", "Impacto esperado"],
    faqs: [
      {
        question: "¿Podemos incluir aliados externos?",
        answer: "Sí, se valora la participación de industria y colegios asociados.",
      },
    ],
  },
  {
    title: "Experiencias de Aprendizaje Inmersivo 2026",
    description:
      "Financia proyectos que utilicen realidad virtual, aumentada o simulaciones para crear experiencias de aprendizaje inmersivas.",
    projectType: "Immersive Learning",
    targetAudience: ["Faculty", "Academic Technology Units"],
    objectives: [
      "Explorar pedagogías inmersivas con VR/AR",
      "Desarrollar contenidos digitales interactivos de alto impacto",
      "Evaluar la eficacia de entornos virtuales en el aprendizaje",
    ],
    openOffsetDays: 30,
    closeOffsetDays: 90,
    evaluationOffsets: {
      start: 95,
      end: 120,
      decision: 130,
      projectStart: 150,
      projectEnd: 510,
    },
    budget: {
      total: 80000000,
      min: 8000000,
      max: 20000000,
      allowedCategories: [
        "VR/AR Equipment",
        "Software licenses",
        "Content development",
        "Training",
      ],
      justificationThreshold: 1000000,
      notes: "Prioridad a proyectos escalables con potencial institucional",
    },
    eligibility: {
      campuses: ["Santiago", "Temuco", "Talca"],
      departments: ["Educación", "Ingeniería", "Ciencias de la Salud", "Arquitectura"],
      academicRanks: ["Assistant Professor", "Associate Professor", "Full Professor"],
      qualifications: ["Experiencia previa con tecnologías educativas", "Proyecto piloto previo"],
      requiredRoles: ["Investigador Principal", "Desarrollador de contenidos"],
      teamMin: 3,
      teamMax: 8,
      notes: "Colaboración con unidad de tecnologías educativas es obligatoria",
      conflictPolicies: [
        "Evaluadores no pueden tener vínculos comerciales con proveedores de tecnología mencionados.",
      ],
    },
    documents: {
      required: ["Project proposal PDF", "Detailed budget", "Technical feasibility study"],
      optional: ["Demo videos", "Pilot results"],
    },
    evaluationSettings: {
      evaluatorsRequired: 3,
      blindReview: true,
      assignmentMethod: "manual",
      conflictPolicies: ["Evaluadores deben declarar conflictos con proveedores de tecnología."],
    },
    evaluationCriteriaNames: [
      "Innovación pedagógica",
      "Impacto esperado",
      "Factibilidad",
      "Presupuesto",
    ],
    faqs: [
      {
        question: "¿Puedo solicitar equipos de VR?",
        answer: "Sí, equipos de VR/AR son elegibles siempre que se justifique su uso pedagógico.",
      },
      {
        question: "¿Debo tener experiencia previa con VR?",
        answer: "Experiencia previa es deseable pero no obligatoria si el equipo incluye especialistas.",
      },
    ],
  },
  {
    title: "Fondo de Innovación Pedagógica 2023",
    description:
      "Primera convocatoria del fondo de innovación pedagógica. Financió proyectos piloto que introdujeron metodologías activas en cursos de primer año.",
    projectType: "Educational Innovation",
    targetAudience: ["Faculty"],
    objectives: [
      "Implementar aprendizaje activo en cursos de primer año",
      "Reducir tasas de reprobación con pedagogías centradas en el estudiante",
      "Crear comunidades de práctica docente",
    ],
    openOffsetDays: -730,
    closeOffsetDays: -670,
    evaluationOffsets: {
      start: -665,
      end: -640,
      decision: -630,
      projectStart: -600,
      projectEnd: -240,
    },
    budget: {
      total: 30000000,
      min: 2000000,
      max: 8000000,
      allowedCategories: ["Teaching materials", "Workshops", "Assessment tools"],
      justificationThreshold: 500000,
      notes: "Primera convocatoria del programa",
    },
    eligibility: {
      campuses: ["Santiago", "Temuco"],
      departments: ["Educación", "Ciencias"],
      academicRanks: ["Assistant Professor", "Associate Professor"],
      qualifications: ["Docencia de primer año activa"],
      requiredRoles: ["Investigador Principal"],
      teamMin: 2,
      teamMax: 4,
      conflictPolicies: ["Declarar colaboraciones previas con evaluadores."],
    },
    documents: {
      required: ["Project proposal PDF", "Simple budget"],
      optional: ["Letters of support"],
    },
    evaluationSettings: {
      evaluatorsRequired: 2,
      blindReview: false,
      assignmentMethod: "manual",
      conflictPolicies: ["Evaluadores deben ser externos al campus del proponente."],
    },
    evaluationCriteriaNames: [
      "Innovación pedagógica",
      "Impacto esperado",
      "Factibilidad",
    ],
    faqs: [
      {
        question: "¿Es necesario ser profesor de planta?",
        answer: "Sí, solo profesores de planta pueden postular como IP.",
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// Proposal seeds
// -----------------------------------------------------------------------------

type ProposalSeed = {
  title: string;
  callTitle: string;
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected"
    | "revise_and_resubmit";
  piEmail: string;
  teamMemberEmails: string[];
  teamInvites: string[];
  assignedEvaluatorEmails: string[];
  submittedOffsetDays?: number;
  abstract: string;
  problemStatement: string;
  methodology: string;
  generalObjective: string;
  specificObjectives: string[];
  timeline: Array<{ milestone: string; offset: number; deliverables: string[]; successCriteria?: string }>;
  budget: {
    narrative: string;
    items: Array<{ category: string; description: string; quantity: number; unitCost: number; justification: string }>;
  };
  impact: {
    expectedOutcomes: string;
    beneficiaries: string;
    indicators: string;
    dissemination: string;
  };
  requiredDocs: Record<string, { fileName: string; content: string; mimeType: string }>;
  optionalDocs?: Record<string, { fileName: string; content: string; mimeType: string }>;
  bookmarksFor?: string[];
  evaluation?: {
    evaluatorEmail: string;
    rubric: Array<{ criteriaName: string; score: number; comments: string; strengths: string[]; weaknesses: string[] }>;
    overallScore: number;
    recommendation: "approve" | "approve_with_modifications" | "reject" | "revise_and_resubmit";
    confidentialComments: string;
    publicComments: string;
  }[];
  decision?: {
    decidedByEmail?: string;
    decidedOffsetDays?: number;
    note?: string;
  };
};

const SEED_PROPOSALS: ProposalSeed[] = [
  {
    title: "Aulas Activas con Aprendizaje Basado en Retos",
    callTitle: "Innovación Docente 2025",
    status: "submitted",
    piEmail: "carlos.faculty@kimia.demo",
    teamMemberEmails: ["laura.faculty@kimia.demo"],
    teamInvites: ["marcela.colaboradora@externo.demo"],
    assignedEvaluatorEmails: ["eva.reviewer@kimia.demo"],
    submittedOffsetDays: -2,
    abstract:
      "Implementación de espacios de aprendizaje activo con retos interdisciplinarios que integran tecnología y mentoría entre pares.",
    problemStatement:
      "Los cursos de primer año presentan baja retención y participación estudiantil, especialmente en asignaturas de ciencias básicas.",
    methodology:
      "Se realizará rediseño instruccional, capacitación docente, implementación de aulas flexibles y seguimiento con analítica de aprendizaje.",
    generalObjective: "Incrementar la retención de primer año mediante experiencias de aprendizaje activo.",
    specificObjectives: [
      "Diseñar 6 retos interdisciplinarios alineados al perfil de egreso",
      "Capacitar a 30 docentes en estrategias activas",
      "Implementar un sistema de analítica de participación estudiantil",
    ],
    timeline: [
      {
        milestone: "Co-diseño curricular",
        offset: 30,
        deliverables: ["Plan de unidades basado en retos", "Guía docente"],
      },
      {
        milestone: "Piloto en asignaturas STEM",
        offset: 120,
        deliverables: ["Reporte de pilotaje", "Encuesta de satisfacción"],
      },
      {
        milestone: "Escalamiento campus",
        offset: 240,
        deliverables: ["Plan de escalamiento", "Indicadores de retención"],
        successCriteria: "80% de docentes capacitados adoptan al menos 2 estrategias activas",
      },
    ],
    budget: {
      narrative: "El financiamiento cubre adecuaciones de aula, licencias de software y capacitaciones docentes.",
      items: [
        {
          category: "Equipment",
          description: "Mobiliario flexible para aulas activas",
          quantity: 10,
          unitCost: 350000,
          justification: "Permite dinamizar actividades colaborativas",
        },
        {
          category: "Professional development",
          description: "Certificación docente en aprendizaje basado en retos",
          quantity: 30,
          unitCost: 85000,
          justification: "Fortalece competencias pedagógicas para el proyecto",
        },
        {
          category: "Learning materials",
          description: "Licencias plataforma de analítica",
          quantity: 12,
          unitCost: 120000,
          justification: "Monitorea participación y engagement estudiantil",
        },
      ],
    },
    impact: {
      expectedOutcomes: "Aumento del 12% en retención de cursos STEM y mejora en engagement estudiantil.",
      beneficiaries: "850 estudiantes de primer año y 30 docentes",
      indicators: "Retención semestral, encuestas de compromiso, analítica de uso",
      dissemination: "Informe público, webinar inter-campus y publicación en repositorio institucional",
    },
    requiredDocs: {
      "Project proposal PDF": {
        fileName: "Propuesta_Aulas_Activas.pdf",
        content: "Contenido de la propuesta de aulas activas...",
        mimeType: "application/pdf",
      },
      "Budget spreadsheet": {
        fileName: "Presupuesto_Aulas_Activas.csv",
        content: "item,monto\nMobiliario,3500000\n",
        mimeType: "text/csv",
      },
      "Dean approval letter": {
        fileName: "Carta_Decano.pdf",
        content: "Carta formal de aprobación de la facultad...",
        mimeType: "application/pdf",
      },
    },
    optionalDocs: {
      "Letters of support": {
        fileName: "Carta_Estudiante.pdf",
        content: "Carta de estudiante destacando beneficios del proyecto",
        mimeType: "application/pdf",
      },
    },
    bookmarksFor: ["admin@kimia.demo", "eva.reviewer@kimia.demo"],
    evaluation: [
      {
        evaluatorEmail: "eva.reviewer@kimia.demo",
        rubric: [
          {
            criteriaName: "Innovación pedagógica",
            score: 4,
            comments: "Integra múltiples técnicas activas con soporte tecnológico",
            strengths: ["Diseño interdisciplinario", "Mentorías estudiantiles"],
            weaknesses: ["Ajustar carga horaria de docentes"],
          },
          {
            criteriaName: "Impacto esperado",
            score: 4,
            comments: "Beneficia a una cohorte completa con indicadores claros",
            strengths: ["Indicadores cuantitativos claros"],
            weaknesses: ["Medir impacto en sedes regionales"],
          },
          {
            criteriaName: "Factibilidad",
            score: 3,
            comments: "Requiere soporte continuado de TI",
            strengths: ["Plan de capacitación"],
            weaknesses: ["Dependencia de infraestructura nueva"],
          },
          {
            criteriaName: "Presupuesto",
            score: 3,
            comments: "Equipamiento alto pero justificado",
            strengths: ["Detalle por unidad"],
            weaknesses: ["Evaluar compras centralizadas"],
          },
        ],
        overallScore: 3.5,
        recommendation: "approve_with_modifications",
        confidentialComments: "Solicitar plan de contingencia para retrasos en mobiliario",
        publicComments: "Recomendado condicionar aprobación a plan de soporte TI.",
      },
    ],
  },
  {
    title: "Portal Único de Servicios Académicos",
    callTitle: "Transformación Digital Académica",
    status: "under_review",
    piEmail: "admin@kimia.demo",
    teamMemberEmails: ["felipe.finance@kimia.demo"],
    teamInvites: ["it.partner@consulting.demo"],
    assignedEvaluatorEmails: ["eva.reviewer@kimia.demo", "mia.reviewer@kimia.demo"],
    submittedOffsetDays: -10,
    abstract:
      "Implementación de un portal único que integra trámites académicos, analítica de servicios y chatbots de orientación estudiantil.",
    problemStatement:
      "Los estudiantes usan múltiples sistemas para trámites básicos, generando duplicidad de consultas y tiempos de respuesta lentos.",
    methodology:
      "Diagnóstico de procesos, desarrollo de integraciones API, analítica de uso y capacitación de oficinas académicas.",
    generalObjective: "Modernizar el acceso a servicios académicos a través de un portal integrado.",
    specificObjectives: [
      "Mapear 25 trámites prioritarios",
      "Desarrollar chatbot con base de conocimientos institucional",
      "Implementar panel de analítica de uso y satisfacción",
    ],
    timeline: [
      {
        milestone: "Levantamiento de requerimientos",
        offset: 15,
        deliverables: ["Mapa de procesos", "Backlog priorizado"],
      },
      {
        milestone: "Desarrollo MVP portal",
        offset: 120,
        deliverables: ["Portal beta", "Integraciones SIS"],
      },
      {
        milestone: "Despliegue y analítica",
        offset: 210,
        deliverables: ["Panel de métricas", "Encuesta de experiencia"],
      },
    ],
    budget: {
      narrative: "Se enfoca en integración tecnológica, analítica y gestión del cambio.",
      items: [
        {
          category: "Software licenses",
          description: "Licencia plataforma chatbot",
          quantity: 12,
          unitCost: 95000,
          justification: "Atención automatizada en portal",
        },
        {
          category: "Infrastructure upgrades",
          description: "Integraciones API y middleware",
          quantity: 1,
          unitCost: 7800000,
          justification: "Conecta sistemas académicos y financieros",
        },
        {
          category: "Specialized consulting",
          description: "Soporte experto en gestión del cambio",
          quantity: 6,
          unitCost: 550000,
          justification: "Capacitación de oficinas académicas",
        },
      ],
    },
    impact: {
      expectedOutcomes: "Reducción del 40% en tiempos de respuesta y portal 24/7 para estudiantes.",
      beneficiaries: "Toda la comunidad estudiantil (~12.000 usuarios)",
      indicators: "Tiempos de respuesta, NPS estudiantil, tickets resueltos",
      dissemination: "Reporte ejecutivo, demo institucional y toolkit de adopción",
    },
    requiredDocs: {
      "Implementation roadmap": {
        fileName: "Roadmap_Portal.pdf",
        content: "Hitos clave para la implementación del portal único...",
        mimeType: "application/pdf",
      },
      "Budget spreadsheet": {
        fileName: "Presupuesto_Portal.csv",
        content: "categoria,monto,justificacion\nLicencias,1140000,Portal\n",
        mimeType: "text/csv",
      },
      "Risk assessment": {
        fileName: "Riesgos_Portal.docx",
        content: "Resumen de riesgos y mitigaciones",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    },
    bookmarksFor: ["sysadmin@kimia.demo"],
  },
  {
    title: "Laboratorio de Competencias Digitales en Educación",
    callTitle: "Laboratorios de Innovación Curricular",
    status: "submitted",
    piEmail: "laura.faculty@kimia.demo",
    teamMemberEmails: ["carlos.faculty@kimia.demo"],
    teamInvites: [],
    assignedEvaluatorEmails: [],
    submittedOffsetDays: -8,
    abstract:
      "Diseño de laboratorio para desarrollar competencias digitales en carreras de educación mediante proyectos colaborativos.",
    problemStatement:
      "Los estudiantes de pedagogía requieren fortalecer su alfabetización digital para nuevas modalidades de enseñanza.",
    methodology:
      "Talleres guiados, mentoría, y creación de recursos digitales integrados al currículo.",
    generalObjective: "Fortalecer competencias digitales docentes en formación.",
    specificObjectives: [
      "Implementar laboratorio móvil",
      "Diseñar toolkit de recursos digitales",
      "Evaluar impacto en prácticas profesionales",
    ],
    timeline: [
      {
        milestone: "Diseño de laboratorio",
        offset: 25,
        deliverables: ["Blueprint laboratorio", "Lista de equipamiento"],
      },
      {
        milestone: "Piloto en asignaturas",
        offset: 150,
        deliverables: ["Unidad piloto", "Rubrica de evaluación"],
      },
    ],
    budget: {
      narrative: "Se inversirá en equipamiento y formación docente.",
      items: [
        {
          category: "Equipment",
          description: "Kit de tabletas y accesorios",
          quantity: 8,
          unitCost: 280000,
          justification: "Permite prácticas digitales con estudiantes",
        },
      ],
    },
    impact: {
      expectedOutcomes: "Toolkit replicable para carreras de educación",
      beneficiaries: "120 estudiantes de pedagogía",
      indicators: "Evaluaciones de práctica, encuestas de autoeficacia",
      dissemination: "Repositorio digital y webinar",
    },
    requiredDocs: {
      "Curriculum redesign brief": {
        fileName: "Brief_Innovacion_Curricular.pdf",
        content: "Resumen del rediseño curricular propuesto...",
        mimeType: "application/pdf",
      },
      "Budget spreadsheet": {
        fileName: "Presupuesto_Lab.csv",
        content: "item,monto\nTablets,2240000\n",
        mimeType: "text/csv",
      },
    },
  },
  {
    title: "Rediseño Curricular Basado en Proyectos Reales",
    callTitle: "Laboratorios de Innovación Curricular",
    status: "submitted",
    piEmail: "carlos.faculty@kimia.demo",
    teamMemberEmails: [],
    teamInvites: [],
    assignedEvaluatorEmails: [],
    submittedOffsetDays: -6,
    abstract:
      "Propuesta para rediseñar el currículo de Ingeniería mediante proyectos vinculados con empresas e instituciones reales.",
    problemStatement:
      "Los egresados carecen de experiencia práctica al momento de integrarse al mercado laboral.",
    methodology:
      "Co-diseño con empleadores, definición de rúbricas auténticas, implementación piloto en 3 asignaturas clave.",
    generalObjective: "Transformar la malla hacia un modelo basado en desafíos del mundo real.",
    specificObjectives: [
      "Establecer alianzas con 5 empresas regionales",
      "Diseñar 3 proyectos integradores por semestre",
      "Capacitar a 10 docentes en metodologías activas",
    ],
    timeline: [
      {
        milestone: "Firma de convenios",
        offset: 30,
        deliverables: ["Acuerdos firmados", "Mapeo de competencias"],
      },
      {
        milestone: "Diseño de proyectos",
        offset: 90,
        deliverables: ["Rúbricas validadas", "Guías docentes"],
        successCriteria: "Aprobación del comité curricular",
      },
      {
        milestone: "Piloto semestre 1",
        offset: 180,
        deliverables: ["Informe de implementación", "Encuestas de satisfacción"],
      },
    ],
    budget: {
      total: 8500000,
      narrative: "Honorarios para facilitadores externos y material didáctico",
      items: [
        {
          category: "Consulting",
          description: "Expertos en diseño curricular",
          quantity: 120,
          unitCost: 45000,
          justification: "Necesario para co-diseño con industria",
        },
        {
          category: "Workshops",
          description: "Capacitación docente",
          quantity: 6,
          unitCost: 350000,
          justification: "Formación en metodologías activas",
        },
        {
          category: "Materials",
          description: "Kits de prototipado para proyectos",
          quantity: 30,
          unitCost: 85000,
          justification: "Insumos para trabajos prácticos",
        },
      ],
    },
    impact: {
      expectedOutcomes: "Egresados con portafolio de proyectos reales, tasa de empleabilidad +15%",
      beneficiaries: "150 estudiantes de Ingeniería por cohorte",
      indicators: "Portafolios completados (100%), tasa de empleabilidad, satisfacción empresarial",
      dissemination: "Jornadas de socialización, manual de buenas prácticas compartido con otras carreras",
    },
    keywords: ["aprendizaje basado en proyectos", "vinculación industria", "currículo innovador"],
    attachments: {
      "Curriculum redesign brief": {
        fileName: "Brief_ABP_Ingenieria.pdf",
        content: "Propuesta detallada de rediseño curricular...",
        mimeType: "application/pdf",
      },
      "Budget spreadsheet": {
        fileName: "Presupuesto_ABP.xlsx",
        content: "Desglose completo del presupuesto",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    },
  },
  {
    title: "Implementación de Learning Analytics para Retención Estudiantil",
    callTitle: "Transformación Digital Académica",
    status: "in_execution",
    piEmail: "laura.faculty@kimia.demo",
    teamMemberEmails: ["carlos.faculty@kimia.demo"],
    teamInvites: [],
    assignedEvaluatorEmails: ["eva.reviewer@kimia.demo", "mia.reviewer@kimia.demo"],
    submittedOffsetDays: -45,
    abstract:
      "Proyecto aprobado que implementa un sistema de analítica de aprendizaje para identificar estudiantes en riesgo y mejorar tasas de retención mediante intervenciones tempranas basadas en datos.",
    problemStatement:
      "La universidad enfrenta tasas de deserción del 18% en primer año. Necesitamos identificar tempranamente a estudiantes en riesgo para intervenir antes de que abandonen.",
    methodology:
      "Implementación de plataforma de learning analytics con dashboards predictivos, alertas automáticas y workflows de intervención coordinados entre docentes y servicios estudiantiles.",
    generalObjective: "Reducir deserción de primer año en 25% mediante analítica predictiva y intervenciones tempranas.",
    specificObjectives: [
      "Integrar datos de 5 fuentes institucionales (SIS, LMS, biblioteca, asistencia, finanzas)",
      "Desarrollar modelo predictivo de riesgo de deserción con 85%+ de precisión",
      "Capacitar a 50 docentes en uso de dashboards y estrategias de intervención",
      "Implementar workflow de alertas y seguimiento para 1,200 estudiantes de primer año"
    ],
    timeline: [
      {
        milestone: "Integración de datos y ETL",
        offset: -30, // Started 30 days ago
        deliverables: [
          "Pipeline ETL funcional",
          "Esquema de data warehouse documentado",
          "Dashboard de calidad de datos"
        ],
        successCriteria: "100% de fuentes integradas con actualización diaria"
      },
      {
        milestone: "Modelo predictivo y validación",
        offset: 60, // Due in 60 days
        deliverables: [
          "Modelo ML entrenado y validado",
          "Documentación técnica del algoritmo",
          "Análisis de sesgo y equidad"
        ],
        successCriteria: "Precisión >= 85%, falsos positivos < 15%"
      },
      {
        milestone: "Dashboards y capacitación docente",
        offset: 120, // Due in 120 days
        deliverables: [
          "Dashboards desplegados en producción",
          "Material de capacitación docente",
          "Piloto con 10 docentes completado"
        ],
        successCriteria: "90% de docentes capacitados se sienten competentes usando el sistema"
      },
      {
        milestone: "Despliegue completo y evaluación",
        offset: 210, // Due in 210 days
        deliverables: [
          "Sistema en producción para toda la cohorte",
          "Informe de impacto semestral",
          "Plan de sostenibilidad"
        ],
        successCriteria: "Reducción mensurable de deserción en primer semestre"
      }
    ],
    budget: {
      narrative: "Presupuesto enfocado en infraestructura de datos, desarrollo de software y capacitación institucional.",
      items: [
        {
          category: "Software licenses",
          description: "Plataforma de learning analytics (12 meses)",
          quantity: 12,
          unitCost: 180000,
          justification: "Licencia SaaS con soporte y actualizaciones incluidas"
        },
        {
          category: "Infrastructure upgrades",
          description: "Servidor de analítica y almacenamiento",
          quantity: 1,
          unitCost: 4500000,
          justification: "Procesamiento de datos de 12,000 estudiantes en tiempo real"
        },
        {
          category: "Specialized consulting",
          description: "Científico de datos senior (6 meses)",
          quantity: 6,
          unitCost: 950000,
          justification: "Desarrollo y validación del modelo predictivo"
        },
        {
          category: "Professional development",
          description: "Talleres de capacitación docente (5 sesiones)",
          quantity: 5,
          unitCost: 320000,
          justification: "Formación en analítica educativa y estrategias de intervención"
        }
      ]
    },
    impact: {
      expectedOutcomes: "Reducción de 25% en deserción de primer año (de 18% a 13.5%), mejora en tasas de aprobación",
      beneficiaries: "1,200 estudiantes de primer año, 50 docentes, servicios estudiantiles",
      indicators: "Tasa de deserción, tasa de retención, tiempo promedio de intervención, satisfacción docente",
      dissemination: "Publicación en conferencia de analítica educativa, presentación en red interuniversitaria"
    },
    requiredDocs: {
      "Implementation roadmap": {
        fileName: "Roadmap_Analytics.pdf",
        content: "Roadmap detallado del proyecto de learning analytics...",
        mimeType: "application/pdf"
      },
      "Budget spreadsheet": {
        fileName: "Presupuesto_Analytics.xlsx",
        content: "Desglose presupuestario completo",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      },
      "Risk assessment": {
        fileName: "Riesgos_Analytics.pdf",
        content: "Análisis de riesgos y estrategias de mitigación",
        mimeType: "application/pdf"
      }
    },
    decision: {
      decidedByEmail: "admin@kimia.demo",
      decidedOffsetDays: -35,
      note: "Proyecto aprobado con presupuesto completo. Alta prioridad institucional por impacto en retención."
    },
    evaluation: [
      {
        evaluatorEmail: "eva.reviewer@kimia.demo",
        rubric: [
          {
            criteriaName: "Impacto esperado",
            score: 5,
            comments: "Aborda problema crítico institucional con métricas claras",
            strengths: ["Alineado con prioridades estratégicas", "KPIs cuantificables"],
            weaknesses: []
          },
          {
            criteriaName: "Factibilidad",
            score: 4,
            comments: "Equipo sólido, cronograma realista",
            strengths: ["Experiencia técnica del equipo"],
            weaknesses: ["Depende de coordinación entre múltiples unidades"]
          },
          {
            criteriaName: "Presupuesto",
            score: 4,
            comments: "Bien justificado, alineado con actividades",
            strengths: ["Cotizaciones de proveedores incluidas"],
            weaknesses: ["Considerar costos de mantenimiento año 2"]
          }
        ],
        overallScore: 4.3,
        recommendation: "approve",
        confidentialComments: "Excelente proyecto. Asegurar compromiso de TI y Registro Académico.",
        publicComments: "Recomiendo aprobación. Sugerir plan de comunicación para stakeholders."
      },
      {
        evaluatorEmail: "mia.reviewer@kimia.demo",
        rubric: [
          {
            criteriaName: "Impacto esperado",
            score: 5,
            comments: "Potencial transformador para la retención estudiantil",
            strengths: ["Enfoque basado en evidencia", "Escalable institucionalmente"],
            weaknesses: []
          },
          {
            criteriaName: "Factibilidad",
            score: 5,
            comments: "Metodología clara, equipo experto",
            strengths: ["Piloto antes de despliegue completo"],
            weaknesses: []
          },
          {
            criteriaName: "Presupuesto",
            score: 5,
            comments: "Inversión justificada por retorno esperado",
            strengths: ["ROI calculado en reducción de deserción"],
            weaknesses: []
          }
        ],
        overallScore: 5.0,
        recommendation: "approve",
        confidentialComments: "Proyecto modelo. Considerar para presentación en red interuniversitaria.",
        publicComments: "Aprobación entusiasta. Excelente alineamiento con misión institucional."
      }
    ]
  }
];

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export const listSeededUsers = query({
  args: {},
  handler: () => SEED_USERS.map(({ password, ...rest }) => ({ ...rest, password })),
});

// Cleanup function to remove all demo data
export const cleanupDemoData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete in reverse dependency order to avoid foreign key issues

    // 1. Delete evaluations
    const evaluations = await ctx.db.query("evaluations").collect();
    for (const evaluation of evaluations) {
      await ctx.db.delete(evaluation._id);
    }

    // 2. Delete evaluator assignments
    const assignments = await ctx.db.query("evaluatorAssignments").collect();
    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    // 3. Delete proposals
    const proposals = await ctx.db.query("proposals").collect();
    for (const proposal of proposals) {
      await ctx.db.delete(proposal._id);
    }

    // 4. Delete call FAQs and bookmarks
    const faqs = await ctx.db.query("callFaqs").collect();
    for (const faq of faqs) {
      await ctx.db.delete(faq._id);
    }

    const bookmarks = await ctx.db.query("callBookmarks").collect();
    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    // 5. Delete calls
    const calls = await ctx.db.query("calls").collect();
    for (const call of calls) {
      await ctx.db.delete(call._id);
    }

    // 6. Delete evaluation criteria
    const criteria = await ctx.db.query("evaluationCriteria").collect();
    for (const criterion of criteria) {
      await ctx.db.delete(criterion._id);
    }

    // 7. Delete rubric templates
    const templates = await ctx.db.query("rubricTemplates").collect();
    for (const template of templates) {
      await ctx.db.delete(template._id);
    }

    // 8. Delete activities
    const activities = await ctx.db.query("activities").collect();
    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    return {
      deleted: {
        evaluations: evaluations.length,
        assignments: assignments.length,
        proposals: proposals.length,
        faqs: faqs.length,
        bookmarks: bookmarks.length,
        calls: calls.length,
        criteria: criteria.length,
        templates: templates.length,
        activities: activities.length,
      },
    };
  },
});

// Internal mutation that does the actual seeding work
export const seedDemoDataInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;

    const userIds = new Map<string, Id<"users">>();
    let usersCreated = 0;
    let usersSkipped = 0;

    for (const user of SEED_USERS) {
      const existingAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", user.email)
        )
        .first();

      let userId: Id<"users">;
      if (existingAccount) {
        userId = existingAccount.userId as Id<"users">;
        usersSkipped += 1;
      } else {
        const { user: created } = await createAccount(ctx, {
          provider: "password",
          account: { id: user.email, secret: user.password },
          profile: {
            email: user.email,
            name: user.name,
          },
        });
        userId = created._id as Id<"users">;
        usersCreated += 1;
      }

      const existingProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

      if (existingProfile) {
        await ctx.db.patch(existingProfile._id, {
          role: user.role,
          active: true,
          campus: user.campus,
          department: user.department,
        });
      } else {
        await ctx.db.insert("userProfiles", {
          userId,
          role: user.role,
          campus: user.campus,
          department: user.department,
          academicDegree: undefined,
          researchAreas: [],
          orcid: undefined,
          phone: undefined,
          active: true,
          notificationPreferences: {
            email: true,
            platform: true,
            digest: "weekly",
          },
          createdAt: now,
        });
      }

      userIds.set(user.email, userId);
    }

    const criteriaIds = new Map<string, Id<"evaluationCriteria">>();
    for (const criterion of SEED_EVALUATION_CRITERIA) {
      const existing = await ctx.db
        .query("evaluationCriteria")
        .filter((q) => q.eq(q.field("name"), criterion.name))
        .first();

      if (existing) {
        criteriaIds.set(criterion.name, existing._id as Id<"evaluationCriteria">);
        continue;
      }

      const criterionId = await ctx.db.insert("evaluationCriteria", {
        name: criterion.name,
        description: criterion.description,
        weight: criterion.weight,
        maxScore: criterion.maxScore,
        scale: criterion.scale,
        type: criterion.type,
        createdAt: now,
      });
      criteriaIds.set(criterion.name, criterionId);
    }

    const callIds = new Map<string, Id<"calls">>();
    const callSummaries: Array<{ title: string; slug: string }> = [];
    const adminUserId =
      userIds.get("admin@kimia.demo") || userIds.get("sysadmin@kimia.demo");

    if (!adminUserId) {
      throw new Error("Seeding requires the demo admin user to be created first.");
    }

    for (const callSeed of SEED_CALLS) {
      const slugBase = sanitizeSlug(callSeed.title);
      let slug = slugBase;
      let counter = 1;
      while (true) {
        const conflict = await ctx.db
          .query("calls")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        if (!conflict) break;
        slug = `${slugBase}-${counter}`;
        counter += 1;
      }

      const start = now + callSeed.openOffsetDays * dayMs;
      const close = now + callSeed.closeOffsetDays * dayMs;
      const existing = await ctx.db
        .query("calls")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();

      if (existing) {
        callIds.set(callSeed.title, existing._id as Id<"calls">);
        callSummaries.push({ title: existing.title, slug: existing.slug ?? slug });
        continue;
      }

      const callId = await ctx.db.insert("calls", {
        title: callSeed.title,
        slug,
        description: callSeed.description,
        objectives: callSeed.objectives,
        projectType: callSeed.projectType,
        targetAudience: callSeed.targetAudience,
        eligibility: {
          campuses: callSeed.eligibility.campuses,
          departments: callSeed.eligibility.departments,
          academicRanks: callSeed.eligibility.academicRanks,
          qualifications: callSeed.eligibility.qualifications,
          teamComposition: {
            requiredRoles: callSeed.eligibility.requiredRoles,
            minTeamMembers: callSeed.eligibility.teamMin,
            maxTeamMembers: callSeed.eligibility.teamMax,
            notes: callSeed.eligibility.notes,
          },
          conflictPolicies: callSeed.eligibility.conflictPolicies,
        },
        openDate: start,
        closeDate: close,
        timeline: {
          openDate: start,
          closeDate: close,
          evaluationStart: now + callSeed.evaluationOffsets.start * dayMs,
          evaluationEnd: now + callSeed.evaluationOffsets.end * dayMs,
          decisionDate: now + callSeed.evaluationOffsets.decision * dayMs,
          projectStart: now + callSeed.evaluationOffsets.projectStart * dayMs,
          projectEnd: now + callSeed.evaluationOffsets.projectEnd * dayMs,
          gracePeriodHours: 24,
        },
        budget: {
          total: callSeed.budget.total,
          perProject: { min: callSeed.budget.min, max: callSeed.budget.max },
          allowedCategories: callSeed.budget.allowedCategories,
          justificationThreshold: callSeed.budget.justificationThreshold,
          notes: callSeed.budget.notes,
        },
        documents: {
          required: callSeed.documents.required,
          optional: callSeed.documents.optional,
          templateId: undefined,
          guidelinesId: undefined,
        },
        evaluationSettings: {
          rubricTemplateId: undefined,
          evaluatorsRequired: callSeed.evaluationSettings.evaluatorsRequired,
          blindReview: callSeed.evaluationSettings.blindReview,
          assignmentMethod: callSeed.evaluationSettings.assignmentMethod,
          conflictPolicies: callSeed.evaluationSettings.conflictPolicies,
        },
        status: close > now ? "open" : "closed",
        evaluationCriteria: callSeed.evaluationCriteriaNames
          .map((name) => criteriaIds.get(name))
          .filter((id): id is Id<"evaluationCriteria"> => !!id),
        requiredDocuments: callSeed.documents.required,
        guidelines: undefined,
        createdBy: adminUserId,
        createdAt: now,
        updatedAt: now,
        publishedAt: close > now ? now : undefined,
      });

      for (let index = 0; index < callSeed.faqs.length; index += 1) {
        const faq = callSeed.faqs[index];
        await ctx.db.insert("callFaqs", {
          callId,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          order: index + 1,
          aiGenerated: false,
          createdBy: adminUserId,
          createdAt: now,
          updatedAt: now,
        });
      }

      callIds.set(callSeed.title, callId);
      callSummaries.push({ title: callSeed.title, slug });
    }

    const proposalSummaries: Array<{ title: string; status: string }> = [];
    for (const seed of SEED_PROPOSALS) {
      const callId = callIds.get(seed.callTitle);
      if (!callId) {
        continue;
      }

      const existing = await ctx.db
        .query("proposals")
        .withIndex("by_call", (q) => q.eq("callId", callId))
        .filter((q) => q.eq(q.field("title"), seed.title))
        .first();
      if (existing) {
        proposalSummaries.push({ title: existing.title, status: existing.status });
        continue;
      }

      const piId = userIds.get(seed.piEmail);
      if (!piId) {
        continue;
      }

      const teamMemberIds = seed.teamMemberEmails
        .map((email) => userIds.get(email))
        .filter((id): id is Id<"users"> => !!id);

      const assignedEvaluatorIds = seed.assignedEvaluatorEmails
        .map((email) => userIds.get(email))
        .filter((id): id is Id<"users"> => !!id);

      // Note: File attachments are skipped in seeding since storage is not available in mutations
      // You can add documents manually through the UI after seeding
      const attachments: Array<{
        storageId: Id<"_storage">;
        name: string;
        type: "required" | "optional";
        requirementId?: string;
      }> = [];

      const timeline = seed.timeline.map((item) => ({
        milestone: item.milestone,
        deadline: new Date(now + item.offset * dayMs).toISOString(),
        deliverables: item.deliverables,
        successCriteria: item.successCriteria,
      }));

      const budgetBreakdown = seed.budget.items.map((item) => ({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitCost,
        amount: item.quantity * item.unitCost,
        justification: item.justification,
      }));
      const budgetTotal = budgetBreakdown.reduce((sum, item) => sum + item.amount, 0);

      const isDecisionStatus = ["approved", "rejected", "revise_and_resubmit", "in_execution", "completed"].includes(
        seed.status
      );
      const decisionEmail = seed.decision?.decidedByEmail ?? "admin@kimia.demo";
      const decisionBy =
        isDecisionStatus ? userIds.get(decisionEmail) ?? adminUserId : undefined;
      const decisionAt = isDecisionStatus
        ? now + (seed.decision?.decidedOffsetDays ?? 0) * dayMs
        : undefined;
      const decisionNote = isDecisionStatus ? seed.decision?.note : undefined;

      // Execution tracking for in_execution status
      const isInExecution = seed.status === "in_execution" || seed.status === "completed";
      const kickoffDate = isInExecution ? now + (seed.decision?.decidedOffsetDays ?? -35) * dayMs + 3 * dayMs : undefined;

      // Build milestone execution tracking for in_execution projects
      const milestoneExecution = isInExecution ? timeline.map((tm, index) => {
        const plannedDeadline = new Date(tm.deadline).getTime();
        const isPast = plannedDeadline < now;
        const isNear = plannedDeadline < now + 60 * dayMs && plannedDeadline > now;

        let status: "not_started" | "in_progress" | "completed" | "delayed" | "blocked";
        let completedAt: number | undefined;
        let daysDelayed: number | undefined;

        if (index === 0) {
          // First milestone - completed with delay
          status = "completed";
          completedAt = plannedDeadline + 5 * dayMs; // 5 days late
          daysDelayed = 5;
        } else if (index === 1 && isNear) {
          // Second milestone - in progress
          status = "in_progress";
        } else if (isPast) {
          status = "delayed";
        } else {
          status = "not_started";
        }

        return {
          milestoneIndex: index,
          status,
          plannedDeadline,
          startedAt: index <= 1 ? plannedDeadline - 15 * dayMs : undefined,
          completedAt,
          daysDelayed,
          delayReason: daysDelayed ? "Retrasos en coordinación con unidades de soporte" : undefined,
          deliverableSubmissions: tm.deliverables.map((delivName) => ({
            deliverableName: delivName,
            required: true,
            status: (index === 0 ? "approved" : index === 1 ? "submitted" : "pending") as "pending" | "submitted" | "under_review" | "approved" | "needs_revision",
            submittedAt: index === 0 ? completedAt : index === 1 ? now - 3 * dayMs : undefined,
            submittedBy: index <= 1 ? piId : undefined,
            reviewedBy: index === 0 ? adminUserId : undefined,
            reviewedAt: index === 0 ? (completedAt ?? 0) + 1 * dayMs : undefined,
            reviewComments: index === 0 ? "Entregables aprobados. Excelente calidad de documentación." : undefined
          })),
          budgetSnapshot: index === 0 ? {
            allocated: Math.floor(budgetTotal * 0.3),
            disbursed: Math.floor(budgetTotal * 0.3),
            spent: Math.floor(budgetTotal * 0.28),
            pending: 0
          } : index === 1 ? {
            allocated: Math.floor(budgetTotal * 0.4),
            disbursed: Math.floor(budgetTotal * 0.2),
            spent: Math.floor(budgetTotal * 0.15),
            pending: Math.floor(budgetTotal * 0.05)
          } : undefined,
          successEvaluation: index === 0 ? {
            met: true,
            evidence: "100% de fuentes integradas con latencia < 24h",
            evaluatedBy: adminUserId,
            evaluatedAt: (completedAt ?? 0) + 2 * dayMs
          } : undefined
        };
      }) : undefined;

      // Budget execution tracking
      const budgetExecution = isInExecution ? {
        committed: budgetTotal,
        disbursed: Math.floor(budgetTotal * 0.5),
        spent: Math.floor(budgetTotal * 0.43),
        available: Math.floor(budgetTotal * 0.5),
        pendingApproval: Math.floor(budgetTotal * 0.05),
        byCategory: budgetBreakdown.map(item => ({
          category: item.category,
          committed: item.amount,
          spent: Math.floor(item.amount * (item.category === "Software licenses" ? 0.5 : item.category === "Infrastructure upgrades" ? 0.8 : 0.3)),
          percentUtilized: item.category === "Infrastructure upgrades" ? 80 : item.category === "Software licenses" ? 50 : 30
        })),
        variance: Math.floor(budgetTotal * 0.07), // Under budget
        variancePercent: 7,
        lastUpdated: now
      } : undefined;

      // Execution metrics
      const executionMetrics = isInExecution ? {
        overallProgress: 25, // 1/4 milestones completed
        onTimeDeliveryRate: 0, // 0% on time (milestone 1 was delayed)
        budgetUtilizationRate: 43,
        overdueDeliverables: 0,
        pendingReports: ["Progress Report Q1"],
        lastCalculated: now
      } : undefined;

      // Active alerts
      const activeAlerts = isInExecution ? [
        {
          type: "deadline_approaching" as const,
          severity: "warning" as const,
          message: `Milestone "${timeline[1]?.milestone}" due in ${Math.ceil((new Date(timeline[1]?.deadline ?? "").getTime() - now) / dayMs)} days`,
          entityId: "1",
          createdAt: now - 2 * dayMs
        },
        {
          type: "missing_report" as const,
          severity: "critical" as const,
          message: "Progress Report Q1 overdue by 5 days",
          entityId: "report_q1",
          createdAt: now - 5 * dayMs
        }
      ] : undefined;

      const nextMilestoneDue = isInExecution && timeline[1] ? new Date(timeline[1].deadline).getTime() : undefined;
      const nextDeliverableDue = isInExecution && timeline[1]?.deliverables[0] ? timeline[1].deliverables[0] : undefined;

      const proposalId = await ctx.db.insert("proposals", {
        callId,
        title: seed.title,
        keywords: ["innovación", "kimia"],
        principalInvestigator: piId,
        teamMembers: teamMemberIds,
        abstract: seed.abstract,
        problemStatement: seed.problemStatement,
        generalObjective: seed.generalObjective,
        specificObjectives: seed.specificObjectives,
        objectives: [seed.generalObjective, ...seed.specificObjectives],
        methodology: seed.methodology,
        researchDesign: "Mixto",
        dataCollection: "Encuestas, analítica, focus group",
        analysisPlan: "Análisis comparativo pre/post intervención",
        timeline,
        budget: {
          total: budgetTotal,
          narrative: seed.budget.narrative,
          breakdown: budgetBreakdown,
        },
        impact: seed.impact,
        status: seed.status,
        documents: attachments.map((attachment) => attachment.storageId),
        attachments,
        teamInvites: seed.teamInvites,
        assignedEvaluators: assignedEvaluatorIds,
        decisionBy,
        decisionAt,
        decisionNote,
        submittedAt:
          seed.status === "submitted" ||
          seed.status === "under_review" ||
          seed.status === "approved" ||
          seed.status === "rejected" ||
          seed.status === "revise_and_resubmit" ||
          seed.status === "in_execution" ||
          seed.status === "completed"
            ? now + (seed.submittedOffsetDays ?? -1) * dayMs
            : undefined,

        // Execution tracking fields
        kickoffDate,
        actualStartDate: kickoffDate,
        milestoneExecution,
        budgetExecution,
        executionMetrics,
        activeAlerts,
        nextMilestoneDue,
        nextDeliverableDue,

        createdAt: now,
        updatedAt: now,
      });

      for (const evaluatorId of assignedEvaluatorIds) {
        await ctx.db.insert("evaluatorAssignments", {
          proposalId,
          evaluatorId,
          assignedBy: adminUserId,
          assignmentMethod: "manual",
          status: "accepted",
          assignedAt: now,
          respondedAt: now,
          declineReason: undefined,
          declineComment: undefined,
          coiDeclared: false,
        });
      }

      if (seed.bookmarksFor) {
        for (const email of seed.bookmarksFor) {
          const bookmarkUser = userIds.get(email);
          if (!bookmarkUser) continue;
          const existingBookmark = await ctx.db
            .query("bookmarks")
            .withIndex("unique_bookmark", (q) => q.eq("userId", bookmarkUser).eq("callId", callId))
            .first();
          if (!existingBookmark) {
            await ctx.db.insert("bookmarks", {
              userId: bookmarkUser,
              callId,
              createdAt: now,
            });
          }
        }
      }

      if (seed.evaluation) {
        for (const evaluation of seed.evaluation) {
          const evaluatorId = userIds.get(evaluation.evaluatorEmail);
          if (!evaluatorId) continue;

          await ctx.db.insert("evaluations", {
            proposalId,
            evaluatorId,
            rubric: evaluation.rubric
              .map((entry) => {
                const criteriaId = criteriaIds.get(entry.criteriaName);
                const criterion = SEED_EVALUATION_CRITERIA.find(
                  (c) => c.name === entry.criteriaName
                );
                if (!criteriaId || !criterion) return null;
                return {
                  criteriaId,
                  score: entry.score,
                  maxScore: criterion.maxScore,
                  comments: entry.comments,
                  strengths: entry.strengths,
                  weaknesses: entry.weaknesses,
                };
              })
              .filter((item): item is NonNullable<typeof item> => !!item),
            overallScore: evaluation.overallScore,
            recommendation: evaluation.recommendation,
            budgetAdjustment: undefined,
            confidentialComments: evaluation.confidentialComments,
            publicComments: evaluation.publicComments,
            completedAt: now,
            aiAssistanceUsed: false,
            createdAt: now,
          });
        }
      }

      proposalSummaries.push({ title: seed.title, status: seed.status });
    }

    return {
      usersCreated,
      usersSkipped,
      callsSeeded: callSummaries,
      proposalsSeeded: proposalSummaries,
    };
  },
});

// Public action that calls the internal mutation
export const seedDemoData = action({
  args: {},
  handler: async (ctx) => {
    // First, cleanup existing demo data
    console.log("Cleaning up existing demo data...");
    const cleanupResult = await ctx.runMutation(internal.seed.cleanupDemoData);
    console.log("Cleanup complete:", cleanupResult);

    // Then, seed fresh data
    console.log("Seeding fresh demo data...");
    const seedResult = await ctx.runMutation(internal.seed.seedDemoDataInternal);

    return {
      cleanup: cleanupResult,
      seed: seedResult,
    };
  },
});

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

function sanitizeSlug(input: string) {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return normalized
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
