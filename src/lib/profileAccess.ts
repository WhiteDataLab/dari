// 프로필 편집 권한 (PROJECT_SPEC §7.4 클레임)
// - 당사자(userId 일치): 본인 프로필이든 클레임된 프로필이든 항상 편집 가능
// - 등록자(ownerId 일치): 클레임 전에는 편집 가능, 클레임 후에는 당사자가 허용한 경우만
export function canEditProfile(
  viewerId: string,
  profile: { ownerId: string; userId: string | null; ownerCanEdit: boolean },
): boolean {
  if (profile.userId === viewerId) return true;
  if (profile.ownerId !== viewerId) return false;
  return profile.userId === null || profile.ownerCanEdit;
}
