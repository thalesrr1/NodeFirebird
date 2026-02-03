import { ExpressAdapter } from '../../src/adapters/ExpressAdapter';

describe('ExpressAdapter', () => {
  let core: any;
  let app: any;
  let adapter: ExpressAdapter;

  beforeEach(() => {
    core = { isConnected: jest.fn(() => true), executeQuery: jest.fn(async () => ({ result: 'ok' })) };
    app = { use: jest.fn(), get: jest.fn(), post: jest.fn() };
    adapter = new ExpressAdapter(core);
  });

  it('applyTo deve chamar os métodos internos na ordem correta', () => {
    const spyAdd = jest.spyOn(adapter as any, 'addSecurityMiddlewares');
    const spySetupFramework = jest.spyOn(adapter as any, 'setupFrameworkRoutes');
    const spySetupCore = jest.spyOn(adapter as any, 'setupCoreRoutes');

    adapter.applyTo(app);

    const callOrder = [spyAdd, spySetupFramework, spySetupCore];
    callOrder.forEach((spy) => expect(spy).toHaveBeenCalled());
    expect(spyAdd.mock.invocationCallOrder[0]).toBeLessThan(spySetupFramework.mock.invocationCallOrder[0]);
    expect(spySetupFramework.mock.invocationCallOrder[0]).toBeLessThan(spySetupCore.mock.invocationCallOrder[0]);
  });

  it('addSecurityMiddlewares deve registrar middlewares em app.use', () => {
    adapter.addSecurityMiddlewares(app);
    expect(app.use).toHaveBeenCalled();
  });

  it('setupFrameworkRoutes deve registrar rotas /health e /query', () => {
    adapter.setupFrameworkRoutes(app);
    expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(app.post).toHaveBeenCalledWith('/query', expect.any(Function));
  });
});