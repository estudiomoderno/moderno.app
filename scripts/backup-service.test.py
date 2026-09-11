import unittest
from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path
spec=spec_from_file_location('service',Path(__file__).with_name('backup-service.py'));service=module_from_spec(spec);spec.loader.exec_module(service)
class Fake:
    def mlsd(self,folder):
        return [('enviar-invitacion.php',{'type':'file','size':'10','modify':'20260911'})] if folder=='api' else []
class Tests(unittest.TestCase):
    def test_inventory(self):
        self.assertEqual(service.inventory(Fake())[0]['path'],'api/enviar-invitacion.php')
    def test_names(self):
        for name in ['../secret','a/b','a\\b','x\nRETR secret','..','']:
            self.assertFalse(service.safe_name(name))
        self.assertTrue(service.safe_name('config.php'))
    def test_symlink_rejected(self):
        class Link:
            def mlsd(self,folder):return [('outside',{'type':'OS.unix=slink'})]
        with self.assertRaises(ValueError):service.inventory(Link())
if __name__=='__main__':unittest.main()
