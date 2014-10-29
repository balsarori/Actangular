package org.actangular.rest.conf;

import org.actangular.rest.service.api.ActangularRestResponseFactory;
import org.activiti.rest.common.application.ContentTypeResolver;
import org.activiti.rest.common.application.DefaultContentTypeResolver;
import org.activiti.rest.service.api.RestResponseFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * @author Joram Barrez
 */
@Configuration
public class RestConfiguration {

    @Bean()
    public RestResponseFactory restResponseFactory() {
      RestResponseFactory restResponseFactory = new ActangularRestResponseFactory();
      return restResponseFactory;
    }

    @Bean()
    public ContentTypeResolver contentTypeResolver() {
      ContentTypeResolver resolver = new DefaultContentTypeResolver();
      return resolver;
    }
}
