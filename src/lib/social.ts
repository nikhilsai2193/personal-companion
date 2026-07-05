export const publicUser = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

export type PublicUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};
