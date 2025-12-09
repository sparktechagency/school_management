import { USER_ROLE } from '../constant';
import { TAuthUser } from '../interface/authUser';

export const getSchoolIdFromUser = (user: TAuthUser) => {
  const roles: string[] = [
    USER_ROLE.manager,
    USER_ROLE.student,
    USER_ROLE.teacher,
    USER_ROLE.parents,
  ];

  return roles.includes(user.role)
    ? (user.mySchoolId as string)
    : (user.schoolId as string);
};