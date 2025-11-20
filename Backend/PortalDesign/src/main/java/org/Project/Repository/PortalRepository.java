package org.Project.Repository;

import org.Project.Entity.PortalMaster;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortalRepository extends JpaRepository<PortalMaster,Integer> {
}
