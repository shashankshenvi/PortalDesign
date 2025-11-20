package org.Project.Repository;

import org.Project.Entity.ConnectionDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ConnectionRepository extends JpaRepository<ConnectionDetails,Integer> {

    Optional<ConnectionDetails> findByConnectionName(String connectionName);


}
