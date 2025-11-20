package org.Project.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;

@RestController
public class HealthController {

    @Autowired
    private DataSource dataSource;

    @GetMapping("/custom-health")
    public Health customHealth() {
        boolean healthy = checkService();

        if (healthy) {
            return Health.up()
                    .withDetail("status", "DB is reachable")
                    .build();
        } else {
            return Health.down()
                    .withDetail("status", "DB connection failed")
                    .build();
        }
    }

    private boolean checkService() {
        try (Connection conn = dataSource.getConnection()) {
            return conn.isValid(2); // 2 sec timeout
        } catch (Exception e) {
            return false;
        }
    }
}