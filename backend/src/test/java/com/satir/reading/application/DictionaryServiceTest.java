package com.satir.reading.application;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
import com.satir.reading.infrastructure.DictionaryClient;
import com.satir.platform.ratelimit.RateLimiter;
import com.satir.platform.validation.ValidationException;
class DictionaryServiceTest {
 @Test void cachesPublicDefinitionsAndRejectsNonWordSelectionsBeforeSending(){
  var provider=mock(DictionaryClient.class);var limiter=mock(RateLimiter.class);
  when(provider.find("hello")).thenReturn(Optional.of(new DictionaryClient.Entry("hello","A greeting.","Hello there.","","https://en.wiktionary.org/wiki/hello")));
  var service=new DictionaryService(provider,Clock.fixed(Instant.parse("2026-10-16T10:00:00Z"),ZoneOffset.UTC),limiter);
  assertThat(service.find("Hello","local").definition()).isEqualTo("A greeting.");assertThat(service.find("hello","other").word()).isEqualTo("hello");verify(provider,times(1)).find("hello");
  assertThatThrownBy(()->service.find("https://internal/private?x=1","local")).isInstanceOf(ValidationException.class);verifyNoMoreInteractions(provider);
 }
}
