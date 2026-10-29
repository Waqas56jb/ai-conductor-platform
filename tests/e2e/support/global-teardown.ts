import { deleteE2EAuthUsers, deleteE2ECompanies } from "./admin";

export default async function globalTeardown() {
  await deleteE2ECompanies();
  await deleteE2EAuthUsers();
}
