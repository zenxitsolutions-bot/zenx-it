export const FREE_CONSULTATION_HREF = "/enquiry?offer=free-consultation";

export function getEnquiryContext(search = "") {
  const params = new URLSearchParams(search);

  return {
    service: params.get("service") || "",
    isFreeConsultation: params.get("offer") === "free-consultation",
  };
}
