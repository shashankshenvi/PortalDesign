package org.Project.Entity;


import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "TBL_CONNECTIONS")
public class ConnectionDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CONNECTION_ID")
    Integer connectionId;

    @Column(name = "CONNECTION_NAME")
    String connectionName;

    @Column(name = "URL")
    String url;

    @Column(name = "HOST")
    String host;

    @Column(name = "PORT")
    Integer port;

    @Column(name = "USER_NAME")
    String userName;

    @Column(name = "PASSWORD")
    String password;


}
