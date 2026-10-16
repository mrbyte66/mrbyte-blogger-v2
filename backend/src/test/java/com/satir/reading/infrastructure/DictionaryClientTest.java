package com.satir.reading.infrastructure;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import tools.jackson.databind.json.JsonMapper;
class DictionaryClientTest {
 @Test void convertsPublicDefinitionMarkupToPlainTextAndBoundsMeaningCount(){
  var json=JsonMapper.builder().build();var entries=json.readTree("""
   [{"partOfSpeech":"Noun","definitions":[{"definition":"An <a href='/wiki/extra'>extra</a> cost &amp; effort.","examples":["Some <b>overhead</b>."]}]}]
   """);
  var result=DictionaryClient.fromWiktionary("overhead",entries,"https://en.wiktionary.org/wiki/overhead").orElseThrow();
  assertThat(result.definition()).isEqualTo("Noun: An extra cost & effort.");assertThat(result.example()).isEqualTo("Some overhead.");
  assertThat(DictionaryClient.fromWiktionary("none",json.createArrayNode(),"source")).isEmpty();
 }
}
