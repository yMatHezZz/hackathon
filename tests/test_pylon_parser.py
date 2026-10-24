import importlib.util
import unittest
spec = importlib.util.spec_from_file_location("pylon", "scripts/prepare-pylon.py")
pylon = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pylon)

class PylonParserTests(unittest.TestCase):
    def test_extracts_only_article_body(self):
        parser = pylon.ArticleParser()
        parser.feed('<header>MENU</header><div class="kb-article-body kb-article-body--ssr"><p>Orientação publicada.</p><h2>Passo seguinte</h2><p>Confira o cadastro.</p><script>NAO_INCLUIR</script></div><footer>RODAPE</footer>')
        text = parser.markdown()
        self.assertIn('Orientação publicada.', text)
        self.assertIn('**Passo seguinte**', text)
        self.assertNotIn('MENU', text)
        self.assertNotIn('RODAPE', text)
        self.assertNotIn('NAO_INCLUIR', text)
    def test_only_approved_links(self):
        self.assertTrue(pylon.safe_url('https://aprova.help.usepylon.com/articles/123-artigo'))
        self.assertFalse(pylon.safe_url('https://localhost/articles/123'))
        self.assertFalse(pylon.safe_url('https://aprova.help.usepylon.com.evil.example/articles/123'))

if __name__ == '__main__':
    unittest.main()
