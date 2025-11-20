package org.Project.Repository;

import org.Project.Entity.RoleMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<RoleMaster, Integer> {

    List<RoleMaster> findByActiveFlag(Boolean activeFlag);

    @Query("SELECT r.roleName FROM RoleMaster r WHERE r.activeFlag = :activeFlag AND r.roleId IN (:roleIds)")
    List<String> findAllRoleNames(@Param("activeFlag") Boolean activeFlag, @Param("roleIds") List<Integer> roleIds);

    List<RoleMaster> findByRoleIdInAndActiveFlag(List<Integer> roleIds, Boolean activeFlag);

}
